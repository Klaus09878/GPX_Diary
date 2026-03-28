# Tests Directory

Place unit tests here following the naming convention: `*.test.js`

## Getting Started

1. Create a test file: `myFeature.test.js`
2. Run tests: `npm test` (from LiveMapApp/)
3. Current setup: Test discovery only (framework ready for Jest/Mocha integration)

## Test Strategy

- **Unit Tests**: Focus on core services (AppConfig, health parsing, GPX processing)
- **Smoke Tests**: Run `npm run verify:migration` to check ESM migration + critical integration points
- **Manual Integration**: Test via browser after server startup

## Example Structure

```js
// tests/AppConfig.test.js
const AppConfig = require('../src/server/core/AppConfig');

describe('AppConfig', () => {
  test('normalizePublicHttpUrl returns valid URL', () => {
    const result = AppConfig.normalizePublicHttpUrl('https://example.com');
    expect(result).toBe('https://example.com');
  });
});
```
