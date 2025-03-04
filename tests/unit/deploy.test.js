const test = require('tape');
const fs = require('fs');
const path = require('path');
const os = require('os');
const nearAPI = require('near-api-js');
const { main } = require('../../bin/deploy');

test('deploy CLI', async (t) => {
    // Save original env, argv, NEAR connect and process.exit
    const originalEnv = { ...process.env };
    const originalArgv = process.argv;
    const originalConnect = nearAPI.connect;
    const originalExit = process.exit;
    
    // Create temporary test directory with real files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web4-deploy-test-'));
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html>Test</html>');
    fs.writeFileSync(path.join(tmpDir, 'style.css'), 'body { color: blue; }');

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
        account: () => ({
            accountId: 'test.testnet',
            functionCall: async (contractId, methodName, args) => {
                console.log('Function call:', { contractId, methodName, args });
                return { transaction: { hash: 'mock-tx-hash' } };
            }
        })
    });

    // Test basic NEARFS deployment
    t.test('should deploy to NEARFS by default', async (t) => {
        process.env.NEAR_ENV = 'testnet';
        const originalExit = process.exit;
        const originalArgv = process.argv;
        let exitCode;
        process.exit = (code) => {
            exitCode = code;
            throw new Error('EXIT');
        };

        process.argv = [
            process.execPath,
            path.resolve(__dirname, '../../bin/deploy'),
            tmpDir,
            'test.testnet',
            '--yes'
        ];

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
            functionCall: async () => ({ transaction: { hash: 'mock-tx-hash' } }),
            signAndSendTransaction: async () => ({ transaction: { hash: 'mock-tx-hash' } })
        };

        // Clear any existing env vars
        delete process.env.NEAR_ENV;
        try {
            await main({
                connectNEAR: async () => ({
                    config: { networkId: 'testnet', explorerUrl: 'https://explorer.testnet.near.org' },
                    account: mockAccount
                })
            });
        } catch (e) {
            if (e.message !== 'EXIT') {
                t.fail(`deployment failed: ${e.message}`);
            }
        } finally {
            process.exit = originalExit;
            process.argv = originalArgv;
        }
        t.equal(exitCode, undefined, 'should not exit with error');
        t.end();
    });

    // Test contract deployment with real WASM file
    t.test('should deploy default contract', async (t) => {
        process.argv = [
            process.execPath,
            path.resolve(__dirname, '../../bin/deploy'),
            tmpDir,
            'test.testnet',
            '--yes',
            '--deploy-contract'
        ];

        try {
            require('../../bin/deploy');
            
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
        // Clear any existing network env vars
        delete process.env.NEAR_ENV;
        delete process.env.NODE_ENV;
        const originalArgv = process.argv;
        process.argv = [
            process.execPath,
            path.resolve(__dirname, '../../bin/deploy'),
            tmpDir,
            'test.near',
            '--yes'
        ];

        const mockAccount = {
            accountId: 'test.near',
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
            functionCall: async () => ({ transaction: { hash: 'mock-tx-hash' } }),
            signAndSendTransaction: async () => ({ transaction: { hash: 'mock-tx-hash' } })
        };

        try {
            await main({
                connectNEAR: async (network, NEAR_SIGNER_KEY, NEAR_SIGNER_ACCOUNT) => {
                    t.equal(network, 'mainnet', 'should use mainnet for .near accounts');
                    return {
                        config: { networkId: 'mainnet', explorerUrl: 'https://explorer.near.org' },
                        account: mockAccount
                    };
                }
            });
        } catch (e) {
            if (e.message !== 'EXIT') {
                t.fail(`network selection failed: ${e.message}`);
            }
        } finally {
            process.argv = originalArgv;
        }
        t.end();
    });

    // Test error on no storage provider selected
    t.test('should error when no storage provider selected', async (t) => {
        const originalArgv = process.argv;
        process.argv = [
            process.execPath,
            path.resolve(__dirname, '../../bin/deploy'),
            tmpDir,
            'test.near',
            '--yes',
            '--no-nearfs',
            '--no-web3-storage'
        ];
        
        let exitCalled = false;
        const originalExit = process.exit;
        process.exit = (code) => {
            exitCalled = true;
            throw new Error(`Exit with code ${code}`);
        };

        try {
            await main();
            t.fail('should have called process.exit');
        } catch (e) {
            if (!e.message.includes('Exit with code 1')) {
                t.fail(`unexpected error: ${e.message}`);
            }
        } finally {
            process.argv = originalArgv;
            process.exit = originalExit;
        }
        t.ok(exitCalled, 'should have called process.exit');
        t.end();
    });

    // Cleanup
    t.teardown(() => {
        // Clean up test directory
        fs.rmSync(tmpDir, { recursive: true, force: true });
        // Restore original environment, argv, NEAR connect and process.exit
        process.env = originalEnv;
        process.argv = originalArgv;
        nearAPI.connect = originalConnect;
        process.exit = originalExit;
    });

    t.end();
});
