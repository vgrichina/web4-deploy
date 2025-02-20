const test = require('tape');
const http = require('http');
const { deployNEARFS } = require('../../src/util/nearfs');
const { readCAR, readBlock } = require('fast-ipfs');

// Create a mock NEARFS gateway server
function createMockServer() {
    return new Promise((resolve) => {
        let receivedData = Buffer.from([]);
        const server = http.createServer((req, res) => {
            console.log('Received request:', {
                method: req.method,
                url: req.url,
                headers: req.headers
            });

            // Handle HEAD requests for block existence check
            if (req.method === 'HEAD') {
                console.log('HEAD request for block existence check');
                res.writeHead(404); // Block doesn't exist
                res.end();
                return;
            }

            // Handle POST requests for block upload
            if (req.method === 'POST') {
                console.log('POST request for block upload');
                req.on('data', chunk => {
                    receivedData = Buffer.concat([receivedData, chunk]);
                    console.log('Received chunk of size:', chunk.length);
                });
                req.on('end', () => {
                    console.log('Upload complete, total data length:', receivedData.length);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                });
            }
        });
        
        server.listen(0, () => { // 0 = random available port
            const port = server.address().port;
            resolve({ server, port, getData: () => receivedData });
        });
    });
}

test('NEARFS integration', async (t) => {
    const { server, port, getData } = await createMockServer();
    
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
        },
        signAndSendTransaction: async ({ receiverId, actions }) => {
            console.log('Transaction data:', actions);
            // Verify the transaction contains expected data
            const functionCallAction = actions[0];
            t.equal(functionCallAction.methodName, 'fs_store', 'should call fs_store method');
            t.ok(functionCallAction.args.length > 0, 'should have block data');
            return { transaction_outcome: { id: 'test-tx' } };
        }
    };

    // Test successful upload
    t.test('should upload to mock gateway', async (t) => {
        // Create a proper CAR format matching working example
        const testContent = Buffer.from([
            // CAR header
            0x38, 0xa2, 0x65, 0x72, 0x6f, 0x6f, 0x74, 0x73, 0x81, 0xd8, 0x2a, 0x58, 0x23, 0x00, 0x12, 0x20,
            0x48, 0x9f, 0xf5, 0x6d, 0x49, 0x7b, 0x01, 0x80, 0xbd, 0x24, 0xb3, 0x7a, 0xa3, 0x9b, 0x0f, 0xff,
            0xd9, 0x52, 0x61, 0xab, 0x83, 0xc3, 0x3e, 0xf8, 0x69, 0xe1, 0x72, 0x70, 0x82, 0xff, 0x55, 0xe9,
            0x67, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x01, 
            // IPLD block
            0x37, 0x12, 0x20, 0x48, 0x9f, 0xf5, 0x6d, 0x49, 0x7b, 0x01, 0x80, 0xbd, 0x24, 0xb3, 0x7a, 0xa3,
            0x9b, 0x0f, 0xff, 0xd9, 0x52, 0x61, 0xab, 0x83, 0xc3, 0x3e, 0xf8, 0x69, 0xe1, 0x72, 0x70, 0x82,
            0xff, 0x55, 0xe9, 0x0a, 0x13, 0x08, 0x02, 0x12, 0x0d, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20,
            0x57, 0x6f, 0x72, 0x6c, 0x64, 0x0a, 0x18, 0x0d
        ]);
        const mockCli = { flags: { yes: true } };
        
        try {
            // Debug CAR parsing
            const blocks = readCAR(testContent);
            console.log('Parsed blocks:', blocks);
            const processedBlocks = blocks.slice(1).map(b => readBlock(b.data));
            console.log('Processed blocks:', processedBlocks);

            await deployNEARFS(mockAccount, testContent, mockCli, {
                log: console.log, // Enable logs for debugging
                timeout: 1000,
                retryCount: 1,
                gatewayUrl: `http://localhost:${port}`
            });
            const uploadedData = getData();
            t.ok(uploadedData.length > 0, 'should have uploaded data to server');
            t.pass('upload completed with valid blocks');
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
