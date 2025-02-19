const test = require('tape');
const { deployContract } = require('../../src/util/deploy-contract');

test('deployContract', async (t) => {
    // Test deploying default contract
    t.test('should deploy default contract when no path provided', async (t) => {
        const mockAccount = {
            deployContract: async (contract) => {
                t.ok(contract instanceof Buffer, 'should pass contract as Buffer');
                t.ok(contract.length > 0, 'contract should not be empty');
                return { transaction_outcome: { id: 'test' } };
            }
        };
        
        await deployContract(mockAccount);
        t.end();
    });

    // Test deploying custom contract
    t.test('should deploy custom contract from provided path', async (t) => {
        const mockAccount = {
            deployContract: async (contract) => {
                t.ok(contract instanceof Buffer, 'should pass contract as Buffer');
                t.ok(contract.length > 0, 'contract should not be empty');
                return { transaction_outcome: { id: 'test' } };
            }
        };
        
        await deployContract(mockAccount, './data/web4-min.wasm');
        t.end();
    });

    // Test error handling
    t.test('should handle invalid contract path', async (t) => {
        const mockAccount = {
            deployContract: async () => {}
        };
        
        try {
            await deployContract(mockAccount, './nonexistent.wasm');
            t.fail('should throw on invalid path');
        } catch (e) {
            t.ok(e.message.includes('ENOENT'), 'should throw ENOENT error');
        }
        t.end();
    });

    t.end();
});
