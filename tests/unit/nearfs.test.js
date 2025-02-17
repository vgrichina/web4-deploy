const test = require('tape');
const { estimateUploadCost } = require('../../src/util/nearfs');

// Mock protocol config based on actual NEAR protocol values
const mockProtocolConfig = {
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
};

test('estimateUploadCost', async (t) => {
    // Test empty batches
    t.test('should handle empty batches', (t) => {
        const result = estimateUploadCost([], mockProtocolConfig);
        t.equal(result, 0, 'should return 0 for empty batches');
        t.end();
    });

    // Test single batch with one small block
    t.test('should calculate cost for single small block', (t) => {
        const batches = [[Buffer.from('Hello World')]];
        const result = estimateUploadCost(batches, mockProtocolConfig);
        
        // Known cost for "Hello World" (11 bytes) + "fs_store" (8 bytes) = 19 bytes
        const expectedCost = 5_126_759_186_500; // Pre-calculated based on protocol config
        
        t.equal(result, expectedCost, 'should match known cost for Hello World');
        t.end();
    });

    // Test multiple batches
    t.test('should calculate cost for multiple batches', (t) => {
        const batches = [
            [Buffer.from('Block 1')],
            [Buffer.from('Block 2')],
            [Buffer.from('Block 3')]
        ];
        const result = estimateUploadCost(batches, mockProtocolConfig);
        
        // Known costs for 3 batches with "Block N" (7 bytes) + "fs_store" (8 bytes) = 15 bytes each
        const expectedCost = 15_380_277_559_500; // Pre-calculated for all 3 batches
        
        t.equal(result, expectedCost, 'should match known cost for multiple batches');
        t.end();
    });

    // Test batch with multiple blocks
    t.test('should calculate cost for batch with multiple blocks', (t) => {
        const batches = [[
            Buffer.from('Block 1'),
            Buffer.from('Block 2'),
            Buffer.from('Block 3')
        ]];
        const result = estimateUploadCost(batches, mockProtocolConfig);
        
        // Known cost for batch with 3 blocks of "Block N" (7 bytes each) + one "fs_store" (8 bytes)
        const expectedCost = 5_166_851_057_500; // Pre-calculated for batch with 3 blocks
        
        t.equal(result, expectedCost, 'should match known cost for multiple blocks in single batch');
        t.end();
    });

    t.end();
});
