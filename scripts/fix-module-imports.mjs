import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIRECTORY = fileURLToPath(
  new URL('../lib/module/', import.meta.url)
);
const RELATIVE_IMPORT = /(?:from\s+|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g;

const collectJavaScriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(path)));
      continue;
    }

    if (entry.name.endsWith('.js')) {
      files.push(path);
    }
  }

  return files;
};

for (const file of await collectJavaScriptFiles(MODULE_DIRECTORY)) {
  const source = await readFile(file, 'utf8');
  const output = source.replace(RELATIVE_IMPORT, (statement, specifier) => {
    if (extname(specifier) !== '') {
      return statement;
    }

    return statement.replace(specifier, `${specifier}.js`);
  });

  if (output !== source) {
    await writeFile(file, output);
  }
}

console.log('normalized emitted ESM import extensions');
