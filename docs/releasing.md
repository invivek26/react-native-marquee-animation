# Releasing

## Channels

- Stable versions use `bun run release` and npm's `latest` tag.
- Prereleases use `bun run release:next` and npm's `next` tag.
- `workflow_dispatch` creates a verified dry-run artifact without staging or
  publishing it.

Run a `next` release for native ABI, Codegen schema, renderer, lifecycle, or
measurement changes before promoting equivalent behavior to stable.

## Trusted staged publishing

The npm trusted publisher must be restricted to:

- this repository;
- `.github/workflows/release.yml`;
- the `npm` GitHub environment;
- `npm stage publish` only.

Package settings should require 2FA and disallow traditional publish tokens.
The workflow requests `id-token: write`, downloads the already verified
artifact, validates its checksum, and stages it. A maintainer then inspects and
approves the staged package with 2FA. Trusted publishing generates provenance
for public packages from public repositories.

Staged publishing cannot bootstrap a package that does not yet exist on npm.
The first publication requires a separately reviewed, explicitly authorized
one-time process. Configure the trusted publisher and revoke any temporary
credential immediately afterward.

## Checklist

1. Confirm main CI, native packed builds, Release Maestro, and benchmarks are
   green for the release commit.
2. Install the dry-run tarball into a clean consumer app and validate its target
   screens in Release builds.
3. Confirm version, changelog/release notes, compatibility, license, and
   third-party notices.
4. Run the stable or `next` release-it command from a clean `main` checkout.
5. Verify the tag-triggered workflow checks tag/version equality and uploads a
   tarball plus SHA-256 checksum.
6. Inspect the npm staged package, provenance metadata, dependency surface,
   unpacked size, and public declarations.
7. Approve with 2FA.
8. Verify installation by exact version and intended dist-tag from npm.
9. Verify the GitHub release attaches the same tarball and checksum.

Never rebuild the artifact between verification, staging, and the GitHub
release.
