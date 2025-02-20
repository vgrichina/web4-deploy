const test = require('tape');
const fs = require('fs');
const path = require('path');
const os = require('os');
const nearAPI = require('near-api-js');

test('deploy CLI', async (t) => {
    // Save original env and NEAR connect
    const originalEnv = { ...process.env };
    const originalConnect = nearAPI.connect;
    
    // Create temporary test directory with real files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web4-deploy-test-'));
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html>Test</html>');
    fs.writeFileSync(path.join(tmpDir, 'style.css'), 'body { color: blue; }');

    // Mock NEAR account
    const mockAccount = {
        accountId: 'test.testnet',
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
                            }
                        }
                    }
                }),
                status: async () => ({
                    sync_info: { latest_block_hash: 'mock-hash' }
                }),
                gasPrice: async () => ({ gas_price: '100000000' })
            }
        },
        functionCall: async (contractId, methodName, args) => {
            console.log('Function call:', { contractId, methodName, args });
            return { transaction: { hash: 'mock-tx-hash' } };
        }
    };

    // Mock NEAR connection
    nearAPI.connect = async () => ({
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
                            }
                        }
                    }
                }),
                status: async () => ({
                    sync_info: { latest_block_hash: 'mock-hash' }
                }),
                gasPrice: async () => ({ gas_price: '100000000' })
            }
        },
        account: () => mockAccount
    });

    // Test basic NEARFS deployment
    t.test('should deploy to NEARFS by default', async (t) => {
        process.env.NEAR_ENV = 'testnet';
        const cli = {
            input: [tmpDir, 'test.testnet'],
            flags: {
                yes: true,
                nearfs: true
            }
        };

        try {
            const { deploy } = require('../../bin/deploy');
            await deploy(cli);
            t.pass('deployment completed successfully');
        } catch (e) {
            t.fail(`deployment failed: ${e.message}`);
        }
        t.end();
    });

    // Test contract deployment with real WASM file
    t.test('should deploy default contract', async (t) => {
        const cli = {
            input: [tmpDir, 'test.testnet'],
            flags: {
                yes: true,
                nearfs: true,
                deployContract: true
            }
        };

        try {
            const { deploy } = require('../../bin/deploy');
            await deploy(cli);
            
            // Verify the WASM file exists and is readable
            const wasmPath = path.resolve(__dirname, '../../data/web4-min.wasm');
            t.ok(fs.existsSync(wasmPath), 'default WASM contract exists');
            t.ok(fs.statSync(wasmPath).size > 0, 'WASM contract is not empty');
            
            t.pass('contract deployment completed successfully');
        } catch (e) {
            t.fail(`contract deployment failed: ${e.message}`);
        }
        t.end();
    });

    // Test network selection based on account name
    t.test('should select correct network based on account', async (t) => {
        const cli = {
            input: [tmpDir, 'test.near'],
            flags: {
                yes: true,
                nearfs: true
            }
        };

        try {
            const { deploy } = require('../../bin/deploy');
            await deploy(cli);
            t.equal(process.env.NEAR_ENV || 'mainnet', 'mainnet', 'should use mainnet for .near accounts');
        } catch (e) {
            t.fail(`network selection failed: ${e.message}`);
        }
        t.end();
    });

    // Test error on no storage provider selected
    t.test('should error when no storage provider selected', async (t) => {
        const cli = {
            input: [tmpDir, 'test.near'],
            flags: {
                yes: true,
                nearfs: false
            }
        };

        try {
            const { deploy } = require('../../bin/deploy');
            await deploy(cli);
            t.fail('should have thrown error for no storage provider');
        } catch (e) {
            t.ok(e.message.includes('No IPFS pinning service configured'), 
                'should throw appropriate error message');
        }
        t.end();
    });

    // Cleanup
    t.teardown(() => {
        // Clean up test directory
        fs.rmSync(tmpDir, { recursive: true, force: true });
        // Restore original environment and NEAR connect
        process.env = originalEnv;
        nearAPI.connect = originalConnect;
    });

    t.end();
});
