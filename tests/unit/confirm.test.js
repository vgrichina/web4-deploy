const test = require('tape');
const readline = require('readline');
const { confirm } = require('../../src/util/confirm');

test('confirm utility', async (t) => {
    // Save original readline.createInterface
    const originalCreateInterface = readline.createInterface;
    
    // Test 'yes' response
    t.test('should return true for "yes"', async (t) => {
        // Mock readline
        readline.createInterface = () => ({
            question: (query, cb) => cb('yes'),
            close: () => {}
        });
        
        const result = await confirm('Continue?');
        t.equal(result, true, 'should return true for "yes"');
        t.end();
    });

    // Test 'y' response
    t.test('should return true for "y"', async (t) => {
        // Mock readline
        readline.createInterface = () => ({
            question: (query, cb) => cb('y'),
            close: () => {}
        });
        
        const result = await confirm('Continue?');
        t.equal(result, true, 'should return true for "y"');
        t.end();
    });

    // Test 'no' response
    t.test('should return false for "no"', async (t) => {
        // Mock readline
        readline.createInterface = () => ({
            question: (query, cb) => cb('no'),
            close: () => {}
        });
        
        const result = await confirm('Continue?');
        t.equal(result, false, 'should return false for "no"');
        t.end();
    });

    // Cleanup
    t.teardown(() => {
        readline.createInterface = originalCreateInterface;
    });

    t.end();
});
