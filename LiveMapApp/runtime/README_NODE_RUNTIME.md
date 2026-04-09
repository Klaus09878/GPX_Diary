# Portable Node Runtime (Windows)

This project is designed to run without a local Node.js installation on Windows.
The startup script expects a bundled runtime in this location:

- LiveMapApp/runtime/node/node.exe
- LiveMapApp/runtime/node/npm.cmd

## Version policy

- Major pin: Node 20 LTS
- Patch/minor updates are allowed inside major 20 after verification

## Update process

1. Download the official Windows x64 Node 20 LTS zip from nodejs.org.
2. Extract it into LiveMapApp/runtime/node so that node.exe and npm.cmd exist directly in that folder.
3. Replace old runtime files fully (no partial overwrite).
4. Run validation:
   - start_app.bat
   - cd LiveMapApp && npm test
   - cd LiveMapApp && npm run verify:migration
5. Update this file with the exact runtime version and date.

## Runtime manifest

Fill in after each runtime update:

- Runtime version: v20.20.2 (win-x64)
- Source URL: https://nodejs.org/dist/v20.20.2/node-v20.20.2-win-x64.zip
- SHA256 (zip): DC3700FDD57A63EEDB8FD7E3C7BAAA32E6A740A1B904167FF4204BC68ED8BF77
- Updated on: 2026-04-09
- Updated by: GitHub Copilot (implementation step)

## Notes

- Global Node is not required for normal users.
- A developer-only fallback exists via USE_GLOBAL_NODE_FALLBACK=1.
- Keep Node license attribution in LiveMapApp/runtime/COPYING_NODE.txt.
