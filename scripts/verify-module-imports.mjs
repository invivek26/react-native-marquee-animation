import { readdir, readFile } from 'node:fs/promises';
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

const failures = [];
for (const file of await collectJavaScriptFiles(MODULE_DIRECTORY)) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(RELATIVE_IMPORT)) {
    const specifier = match[1];
    if (specifier !== undefined && extname(specifier) === '') {
      failures.push(`${file}: ${specifier}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Extensionless ESM imports:\n${failures.join('\n')}`);
}

console.log('verified emitted ESM import extensions');
