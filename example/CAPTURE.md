# Release capture

The showcase is the default screen. Release builds omit the reliability-lab
button and Expo development UI, embed the JavaScript bundle, and run without
Metro.

Build and install the capture binary from this directory:

```sh
bun run capture:ios
bun run capture:android
```

Each command regenerates its native project before compiling a Release build.
Record the installed showcase with the platform screen recorder and retain the
original video as the source for README and release media. Maestro drives the
deep-linked reliability lab; it is not part of presentation capture.
