const test = require('tape');
const { checkIPFSGateways } = require('../../src/util/gateway-check');

test('checkIPFSGateways', async (t) => {
    const originalFetch = fetch;
    const originalEnv = process.env.IPFS_GATEWAY_LIST;
    
    // Test successful gateway check
    t.test('should check all gateways successfully', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'https://gateway1.io,https://gateway2.io';
        
        // Mock successful responses
        global.fetch = async (url) => {
            return {
                ok: true,
                status: 200
            };
        };
        
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
        process.env.IPFS_GATEWAY_LIST = 'https://slow-gateway.io';
        
        // Mock timeout
        global.fetch = async (url) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            throw new Error('timeout');
        };
        
        try {
            await checkIPFSGateways(['bafytest123']);
            t.pass('should complete despite timeout');
        } catch (e) {
            t.fail('should not throw error on timeout');
        }
        t.end();
    });

    // Test gateway error response
    t.test('should handle gateway error response', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'https://error-gateway.io';
        
        // Mock error response
        global.fetch = async (url) => ({
            ok: false,
            status: 500
        });
        
        try {
            await checkIPFSGateways(['bafytest123']);
            t.pass('should complete despite error response');
        } catch (e) {
            t.fail('should not throw error on bad response');
        }
        t.end();
    });

    // Test multiple CIDs
    t.test('should check multiple CIDs', async (t) => {
        process.env.IPFS_GATEWAY_LIST = 'https://gateway.io';
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

    // Cleanup
    t.teardown(() => {
        global.fetch = originalFetch;
        process.env.IPFS_GATEWAY_LIST = originalEnv;
    });

    t.end();
});
