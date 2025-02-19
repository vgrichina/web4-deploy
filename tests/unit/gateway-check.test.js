const test = require('tape');
const { checkIPFSGateways } = require('../../src/util/gateway-check');

test('checkIPFSGateways', async (t) => {
    const originalFetch = fetch;
    const originalEnv = process.env.IPFS_GATEWAY_LIST;
    const originalDelay = process.env.IPFS_CHECK_DELAY;
    process.env.IPFS_CHECK_DELAY = '100'; // 100ms delay for tests
    
    // Test successful gateway check
    t.test('should check all gateways successfully', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'gateway1.io,gateway2.io';
        
        // Mock successful responses
        global.fetch = async (url) => ({
            ok: true,
            status: 200,
            statusText: 'OK',
            text: async () => 'Success'
        });
        
        try {
            await checkIPFSGateways(['bafytest123']);
            t.pass('should complete without errors');
        } catch (e) {
            t.fail('should not throw error');
        }
        t.end();
    });

    // Test gateway timeout
    t.test('should handle gateway timeout', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'slow-gateway.io';
        let retryCount = 0;
        const MAX_TEST_RETRIES = 3;
        
        // Mock timeout with AbortError, but only retry a few times
        global.fetch = async (url) => {
            retryCount++;
            if (retryCount > MAX_TEST_RETRIES) {
                return { ok: true, status: 200 }; // Eventually succeed
            }
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
        };
        
        try {
            await checkIPFSGateways(['bafytest123']);
            t.pass('should complete after retries');
            t.ok(retryCount > 0, 'should have attempted retries');
            t.ok(retryCount <= MAX_TEST_RETRIES + 1, 'should not retry indefinitely');
        } catch (e) {
            t.fail('should not throw error on timeout');
        }
        t.end();
    });

    // Test gateway error response
    t.test('should handle gateway error response', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'error-gateway.io';
        let retryCount = 0;
        const MAX_ERROR_RETRIES = 3;
        
        // Mock error response
        global.fetch = async (url) => {
            retryCount++;
            if (retryCount > MAX_ERROR_RETRIES) {
                return { ok: true, status: 200 }; // Eventually succeed
            }
            return {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };
        };
        
        try {
            await checkIPFSGateways(['bafytest123']);
            t.pass('should complete after retries');
            t.ok(retryCount > 0, 'should have attempted retries');
            t.ok(retryCount <= MAX_ERROR_RETRIES + 1, 'should not retry indefinitely');
        } catch (e) {
            t.fail('should not throw error on bad response');
        }
        t.end();
    });

    // Test multiple CIDs
    t.test('should check multiple CIDs', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'gateway.io';
        let fetchCount = 0;
        
        // Count fetch calls
        global.fetch = async (url) => {
            fetchCount++;
            return { ok: true, status: 200 };
        };
        
        await checkIPFSGateways(['bafytest123', 'bafytest456']);
        t.equal(fetchCount, 2, 'should make one request per CID');
        t.end();
    });

    // Test rate limiting
    t.test('should handle rate limiting', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'rate-limited.io';
        let retryCount = 0;
        const MAX_RETRIES = 1;
        
        global.fetch = async (url) => {
            retryCount++;
            if (retryCount > MAX_RETRIES) {
                return { ok: true, status: 200 };
            }
            return {
                ok: false,
                status: 429,
                statusText: 'Too Many Requests'
            };
        };
        
        try {
            await checkIPFSGateways(['bafytest123']);
            t.pass('should handle rate limiting');
            t.ok(retryCount > 0, 'should have attempted retry');
        } catch (e) {
            t.fail('should not throw on rate limiting');
        }
        t.end();
    });

    // Test network error
    t.test('should handle network error', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'error.io';
        let retryCount = 0;
        const MAX_RETRIES = 1;
        
        global.fetch = async (url) => {
            retryCount++;
            if (retryCount > MAX_RETRIES) {
                return { ok: true, status: 200 };
            }
            throw new Error('Network error');
        };
        
        try {
            await checkIPFSGateways(['bafytest123']);
            t.pass('should handle network error');
            t.ok(retryCount > 0, 'should have attempted retry');
        } catch (e) {
            t.fail('should not throw on network error');
        }
        t.end();
    });

    // Cleanup
    t.teardown(() => {
        global.fetch = originalFetch;
        process.env.IPFS_GATEWAY_LIST = originalEnv;
        process.env.IPFS_CHECK_DELAY = originalDelay;
    });

    t.end();
});
