# Tests Directory

This folder contains the Jest-based test suite for `LiveMapApp`.

## Running Tests

1. `npm test`
2. `npm run test:watch`
3. `npm run test:coverage`

## Current Focus

- Unit tests for configuration, GPX transformation, and helper validation.
- Route-level tests for critical backend behavior.
- Health-import and other file-processing paths with real assertions.

## Conventions

- Test files use the `*.test.js` naming pattern.
- Tests should import the real module under test.
- Prefer small fixtures and deterministic assertions.
- Keep route tests isolated with stubbed dependencies where practical.

## Smoke Tests

- `npm run verify:migration` remains the migration and startup smoke gate.
- It should complement, not replace, the Jest suite.
