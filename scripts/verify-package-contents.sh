#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <package.tgz>" >&2
  exit 64
fi

archive=$1
if [[ ! -f "$archive" ]]; then
  echo "package archive not found: $archive" >&2
  exit 66
fi

listing=$(mktemp)
trap 'rm -f "$listing"' EXIT
tar -tzf "$archive" | LC_ALL=C sort > "$listing"

required_files=(
  package/LICENSE
  package/README.md
  package/RNMarquee.podspec
  package/THIRD_PARTY_NOTICES.md
  package/android/build.gradle
  package/lib/module/index.js
  package/lib/typescript/src/index.d.ts
  package/package.json
  package/src/RNMarqueeViewNativeComponent.ts
)

for required_file in "${required_files[@]}"; do
  if ! grep -Fqx "$required_file" "$listing"; then
    echo "published package is missing $required_file" >&2
    exit 1
  fi
done

if grep -Eq '(^|/)(node_modules|example|benchmarks|maestro|scripts|tests|\.github|.*\.test\.|androidTest|src/test)(/|$)' "$listing"; then
  echo 'published package contains development-only files:' >&2
  grep -E '(^|/)(node_modules|example|benchmarks|maestro|scripts|tests|\.github|.*\.test\.|androidTest|src/test)(/|$)' "$listing" >&2
  exit 1
fi

maximum_unpacked_bytes=${MAXIMUM_UNPACKED_BYTES:-5000000}
unpacked_bytes=$(tar -xOzf "$archive" | wc -c | tr -d ' ')
if (( unpacked_bytes > maximum_unpacked_bytes )); then
  echo "published package is ${unpacked_bytes} bytes unpacked; limit is ${maximum_unpacked_bytes}" >&2
  exit 1
fi

echo "verified $(wc -l < "$listing" | tr -d ' ') files (${unpacked_bytes} unpacked bytes)"
