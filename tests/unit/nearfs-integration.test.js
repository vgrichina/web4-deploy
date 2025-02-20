const test = require('tape');
const http = require('http');
const { deployNEARFS } = require('../../src/util/nearfs');

// Create a mock NEARFS gateway server
function createMockServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                // Mock successful response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        });
        
        server.listen(0, () => { // 0 = random available port
            const port = server.address().port;
            resolve({ server, port });
        });
    });
}

test('NEARFS integration', async (t) => {
    const { server, port } = await createMockServer();
    
    const mockAccount = {
        connection: {
            provider: {
                experimental_protocolConfig: async () => ({
                    runtime_config: {
                        transaction_costs: {
                            action_creation_config: {
                                function_call_cost: {
                                    send_not_sir: 2_319_900_000_000,
                                    execution: 2_319_900_000_000,
                                },
                                function_call_cost_per_byte: {
                                    send_not_sir: 2_235_934,
                                    execution: 2_235_934,
                                },
                                transfer_cost: {
                                    send_not_sir: 115_123_062_500,
                                    execution: 115_123_062_500,
                                }
                            },
                            action_receipt_creation_config: {
                                send_not_sir: 108_059_500_000,
                                execution: 108_059_500_000,
                            },
                        }
                    }
                }),
                status: async () => ({
                    sync_info: {
                        latest_block_hash: 'mock-block-hash'
                    }
                }),
                gasPrice: async () => ({
                    gas_price: '100000000'
                })
            }
        }
    };

    // Test successful upload
    t.test('should upload to mock gateway', async (t) => {
        const testContent = Buffer.from('test content');
        const mockCli = { flags: { yes: true } };
        
        try {
            await deployNEARFS(mockAccount, testContent, mockCli, {
                log: () => {}, // Silence logs
                timeout: 1000,
                retryCount: 1,
                gatewayUrl: `http://localhost:${port}`
            });
            t.pass('should complete upload successfully');
        } catch (e) {
            t.fail(`upload failed: ${e.message}`);
        }
        t.end();
    });

    // Cleanup
    t.teardown(() => {
        server.close();
    });

    t.end();
});
