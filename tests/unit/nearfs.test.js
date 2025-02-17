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
        t.ok(result > 0, 'should return positive cost');
        t.ok(Number.isInteger(result), 'should return integer value');
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
        const singleBatchResult = estimateUploadCost([batches[0]], mockProtocolConfig);
        t.ok(result > singleBatchResult, 'multiple batches should cost more than single batch');
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
        const singleBlockResult = estimateUploadCost([[Buffer.from('Block 1')]], mockProtocolConfig);
        t.ok(result > singleBlockResult, 'batch with multiple blocks should cost more than single block');
        t.end();
    });

    t.end();
});
