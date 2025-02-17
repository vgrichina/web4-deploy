const test = require('tape');
const { confirm } = require('../../src/util/confirm');

test('confirm utility', async (t) => {
    // Mock stdin/stdout
    const originalStdin = process.stdin;
    const originalStdout = process.stdout;
    
    // Test 'yes' response
    t.test('should return true for "yes"', async (t) => {
        const mockStdin = require('stream').Readable.from(['yes\n']);
        process.stdin = mockStdin;
        
        const result = await confirm('Continue?');
        t.equal(result, true, 'should return true for "yes"');
        t.end();
    });

    // Test 'y' response
    t.test('should return true for "y"', async (t) => {
        const mockStdin = require('stream').Readable.from(['y\n']);
        process.stdin = mockStdin;
        
        const result = await confirm('Continue?');
        t.equal(result, true, 'should return true for "y"');
        t.end();
    });

    // Test 'no' response
    t.test('should return false for "no"', async (t) => {
        const mockStdin = require('stream').Readable.from(['no\n']);
        process.stdin = mockStdin;
        
        const result = await confirm('Continue?');
        t.equal(result, false, 'should return false for "no"');
        t.end();
    });

    // Cleanup
    t.teardown(() => {
        process.stdin = originalStdin;
        process.stdout = originalStdout;
    });

    t.end();
});
