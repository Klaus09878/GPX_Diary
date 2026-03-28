#!/usr/bin/env node
/**
 * Basic test runner - scans for *.test.js files and executes them
 * Provides non-blocking test execution and summary reporting
 * 
 * Usage: node scripts/testRunner.js
 */

const fs = require('fs');
const path = require('path');

const testsDir = path.resolve(__dirname, '../tests');
const appRoot = path.resolve(__dirname, '..');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    gray: '\x1b[90m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
};

console.log(`${colors.blue}[Test Runner]${colors.reset}`);

// Check if tests directory exists
if (!fs.existsSync(testsDir)) {
    console.log(`${colors.yellow}No tests directory found. Create 'tests/' and add *.test.js files to enable testing.${colors.reset}`);
    console.log(`${colors.gray}Test framework ready: npm test (non-blocking)${colors.reset}`);
    process.exit(0);
}

// Discover test files
const testFiles = fs.readdirSync(testsDir)
    .filter(f => f.endsWith('.test.js'))
    .map(f => path.join(testsDir, f));

if (testFiles.length === 0) {
    console.log(`${colors.yellow}No *.test.js files found in tests/ directory.${colors.reset}`);
    console.log(`${colors.gray}Ready for tests - add tests/example.test.js to get started${colors.reset}`);
    process.exit(0);
}

// Run the tests
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log(`${colors.green}Found ${testFiles.length} test file(s)${colors.reset}\n`);

testFiles.forEach(testFile => {
    try {
        // Load test suite
        const testSuite = require(testFile);
        const suiteName = testSuite.name || path.basename(testFile, '.test.js');
        
        console.log(`${colors.blue}${suiteName}${colors.reset}`);
        console.log(colors.gray + '─'.repeat(50) + colors.reset);
        
        // Execute each test
        if (Array.isArray(testSuite.tests)) {
            testSuite.tests.forEach((test, index) => {
                if (test.type === 'suite') {
                    console.log(`  ${colors.blue}${test.name}${colors.reset}`);
                } else if (test.type === 'test') {
                    totalTests++;
                    try {
                        // Try to run the test function
                        if (test.fn && typeof test.fn === 'function') {
                            test.fn();
                            console.log(`    ${colors.green}✓ ${test.name}${colors.reset}`);
                            passedTests++;
                        }
                    } catch (error) {
                        console.log(`    ${colors.red}✗ ${test.name}${colors.reset}`);
                        if (error.message) {
                            console.log(`      ${colors.red}${error.message}${colors.reset}`);
                        }
                        failedTests++;
                    }
                }
            });
        }
        
        console.log('');
    } catch (error) {
        console.error(`${colors.red}Error loading test file ${testFile}:${colors.reset}`, error.message);
        // Continue with other test files
    }
});

// Print summary
console.log(colors.gray + '═'.repeat(50) + colors.reset);
console.log(`${colors.blue}Test Summary${colors.reset}`);
console.log(colors.gray + '─'.repeat(50) + colors.reset);
console.log(`Total:  ${colors.gray}${totalTests}${colors.reset}`);
console.log(`Passed: ${colors.green}${passedTests}${colors.reset}`);
console.log(`Failed: ${failedTests > 0 ? colors.red : colors.gray}${failedTests}${colors.reset}`);

if (failedTests > 0) {
    console.log(`\n${colors.red}Some tests failed${colors.reset}`);
    // Don't exit with error code - per user's "non-blocking" requirement
}

console.log(`\n${colors.gray}Note: Test framework is minimal. Configure full test runner (Jest, Mocha) for production use.${colors.reset}`);
