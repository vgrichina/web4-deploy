const { formatNearAmount } = require('near-api-js').utils.format;
const { blocksToUpload, splitOnBatches, uploadBlocks } = require('nearfs/src/util/upload');

const NEARFS_GATEWAY_URL = process.env.NEARFS_GATEWAY_URL || 'https://ipfs.web4.near.page';
const NEARFS_GATEWAY_TIMEOUT = parseInt(process.env.NEARFS_GATEWAY_TIMEOUT || '2500');
const NEARFS_GATEWAY_RETRY_COUNT = parseInt(process.env.NEARFS_GATEWAY_RETRY_COUNT || '3');

const DEFAULT_OPTIONS = {
    log: console.log,
    timeout: NEARFS_GATEWAY_TIMEOUT,
    retryCount: NEARFS_GATEWAY_RETRY_COUNT,
    gatewayUrl: NEARFS_GATEWAY_URL,
};

async function deployNEARFS(account, carBuffer, options = DEFAULT_OPTIONS) {
    const blocks = await blocksToUpload(carBuffer, options);
    const batches = splitOnBatches(blocks);

    // Estimate the cost of the upload
    // NOTE: See how costs are calculated in nearcore: https://github.com/near/nearcore/blob/master/runtime/runtime/src/config.rs
    const protocolConfig = await account.connection.provider.experimental_protocolConfig({ finality: 'final' });
    const { transaction_costs } = protocolConfig.runtime_config;
    const { action_creation_config, action_receipt_creation_config } = transaction_costs;
    const { function_call_cost, function_call_cost_per_byte, transfer_cost } = action_creation_config;
    const totalGas = batches.reduce((sum, batch) => {
        const actionsGas = batch.reduce((sum, block) => {
            const sendGas = (block.length + 'fs_store'.length) * function_call_cost_per_byte.send_not_sir + function_call_cost.send_not_sir;
            return sum + sendGas;
        }, 0);

        // NOTE: Normally fs_store method not implemented so only first action will be executed and fail
        const failedCallExecGas = batch[0].length * function_call_cost_per_byte.execution + function_call_cost.execution;
        const refundGas = transfer_cost.send_not_sir + transfer_cost.execution;
        const txGas = actionsGas + action_receipt_creation_config.send_not_sir + action_receipt_creation_config.execution + failedCallExecGas + refundGas;
        return sum + txGas;
    }, 0);
    const status = await account.connection.provider.status();
    const { gas_price: gasPrice } = await account.connection.provider.gasPrice(status.sync_info.latest_block_hash);
    console.log('Estimated gas for upload:', totalGas / 1000_000_000_000, 'Tgas');
    console.log('Current gas price:', gasPrice, 'yoctoNEAR');
    console.log('Estimated cost of upload:', formatNearAmount(BigInt(totalGas) * BigInt(gasPrice), 5), 'NEAR');

    await uploadBlocks(account, blocks, options);
}

module.exports = {
    deployNEARFS
}