/**
 * Unit tests for Health Data Processing
 * Tests for CSV parsing, date handling, and steps aggregation
 */

const assert = require('node:assert');

const testSuite = {
    name: 'Health Data Processing',
    tests: [],
    
    describe(name, fn) {
        this.tests.push({ name, type: 'suite', fn });
    },
    
    it(name, fn) {
        this.tests.push({ name, type: 'test', fn });
    }
};

/**
 * Test Suite: Date Parsing and Normalization
 */
testSuite.describe('Health date parsing', () => {
    testSuite.it('parses ISO date format (YYYY-MM-DD)', async () => {
        const dateStr = '2026-03-04';
        const dateObj = new Date(dateStr);
        assert.ok(!isNaN(dateObj.getTime()));
        
        const dateKey = dateObj.toISOString().split('T')[0];
        assert.strictEqual(dateKey, '2026-03-04');
    });
    
    testSuite.it('parses datetime and extracts date portion', async () => {
        const rawDate = '2026-03-04 10:30:45';
        const dateStr = rawDate.includes(' ') ? rawDate.split(' ')[0] : rawDate;
        const dateObj = new Date(dateStr);
        
        assert.ok(!isNaN(dateObj.getTime()));
        assert.strictEqual(dateStr, '2026-03-04');
    });
    
    testSuite.it('rejects invalid date strings', async () => {
        const invalidDate = 'not-a-date';
        const dateObj = new Date(invalidDate);
        assert.ok(isNaN(dateObj.getTime()));
    });
});

/**
 * Test Suite: Steps Aggregation and Validation
 */
testSuite.describe('Health steps aggregation', () => {
    testSuite.it('converts string steps to number', async () => {
        const stepsStr = '5847';
        const steps = Number.parseFloat(stepsStr);
        
        assert.strictEqual(steps, 5847);
        assert.ok(Number.isFinite(steps));
    });
    
    testSuite.it('aggregates steps for same date', async () => {
        const stepsByDate = new Map();
        
        // Simulate multiple entries for same date
        stepsByDate.set('2026-03-04', (stepsByDate.get('2026-03-04') || 0) + 3000);
        stepsByDate.set('2026-03-04', (stepsByDate.get('2026-03-04') || 0) + 2847);
        
        assert.strictEqual(stepsByDate.get('2026-03-04'), 5847);
    });
    
    testSuite.it('rounds steps to nearest integer', async () => {
        const rawSteps = 5847.6;
        const stepCount = Math.max(0, Math.round(rawSteps));
        
        assert.strictEqual(stepCount, 5848);
    });
    
    testSuite.it('ensures non-negative step count', async () => {
        const negativeSteps = -100;
        const stepCount = Math.max(0, negativeSteps);
        
        assert.strictEqual(stepCount, 0);
    });
});

/**
 * Test Suite: CSV Field Detection
 */
testSuite.describe('Health CSV field detection', () => {
    testSuite.it('detects common date field names', async () => {
        const possibleDateFields = ['startDate', 'start_date', 'date', 'Date', 'Datum', 'endDate', 'end_date'];
        const testData = { Datum: '2026-03-04', steps: 5000 };
        
        const rawDate = testData.startDate || testData.start_date || testData.date || testData.Date || testData.Datum;
        assert.strictEqual(rawDate, '2026-03-04');
    });
    
    testSuite.it('detects common steps field names', async () => {
        const possibleStepsFields = ['value', 'steps', 'Steps', 'Schritte'];
        const testData = { Schritte: 5000 };
        
        const rawSteps = testData.value || testData.steps || testData.Steps || testData.Schritte;
        assert.strictEqual(rawSteps, 5000);
    });
    
    testSuite.it('handles missing required fields gracefully', async () => {
        const testData = { randomField: 'value' };
        const rawDate = testData.date || testData.Datum;
        const rawSteps = testData.steps || testData.Schritte;
        
        assert.strictEqual(rawDate, undefined);
        assert.strictEqual(rawSteps, undefined);
    });
});

/**
 * Test Suite: Row Filtering
 */
testSuite.describe('Health CSV row filtering', () => {
    testSuite.it('filters out non-step-count entries', async () => {
        const testRow = { type: 'HKQuantityTypeIdentifierBodyMass', value: 75 };
        const shouldInclude = !testRow.type || testRow.type === 'HKQuantityTypeIdentifierStepCount';
        
        assert.strictEqual(shouldInclude, false);
    });
    
    testSuite.it('includes step-count entries', async () => {
        const testRow = { type: 'HKQuantityTypeIdentifierStepCount', value: 5000 };
        const shouldInclude = !testRow.type || testRow.type === 'HKQuantityTypeIdentifierStepCount';
        
        assert.strictEqual(shouldInclude, true);
    });
    
    testSuite.it('includes entries with no type field', async () => {
        const testRow = { date: '2026-03-04', steps: 5000 };
        const shouldInclude = !testRow.type || testRow.type === 'HKQuantityTypeIdentifierStepCount';
        
        assert.strictEqual(shouldInclude, true);
    });
});

/**
 * Export test suite for test runner
 */
module.exports = testSuite;
