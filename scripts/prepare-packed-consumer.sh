#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <package.tgz> <new-consumer-directory>" >&2
  exit 64
fi

archive=$1
consumer_directory=$2
repository_root=$(cd "$(dirname "$0")/.." && pwd)

if [[ ! -f "$archive" ]]; then
  echo "package archive not found: $archive" >&2
  exit 66
fi

if [[ -e "$consumer_directory" ]]; then
  echo "consumer directory already exists: $consumer_directory" >&2
  exit 73
fi

mkdir -p "$consumer_directory"
rsync -a \
  --exclude '.expo' \
  --exclude 'android' \
  --exclude 'dist' \
  --exclude 'ios' \
  --exclude 'metro.config.js' \
  --exclude 'node_modules' \
  --exclude 'react-native.config.js' \
  --exclude 'tsconfig.json' \
  "$repository_root/example/" "$consumer_directory/"

archive_directory=$(cd "$(dirname "$archive")" && pwd)
archive_path="$archive_directory/$(basename "$archive")"

(
  cd "$consumer_directory"
  bun install
  bun add --exact "$archive_path"
)

echo "$consumer_directory"
