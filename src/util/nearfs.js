const timeoutSignal = require("timeout-signal");
const { transactions } = require('near-api-js');
const { readCAR, readBlock, cidToString } = require('fast-ipfs');

const NEARFS_GATEWAY_URL = process.env.NEARFS_GATEWAY_URL || 'https://ipfs.web4.near.page';
const NEARFS_GATEWAY_TIMEOUT = parseInt(process.env.NEARFS_GATEWAY_TIMEOUT || '2500');
const NEARFS_GATEWAY_RETRY_COUNT = parseInt(process.env.NEARFS_GATEWAY_RETRY_COUNT || '3');

const DEFAULT_OPTIONS = {
    timeout: NEARFS_GATEWAY_TIMEOUT,
    retryCount: NEARFS_GATEWAY_RETRY_COUNT,
    gatewayUrl: NEARFS_GATEWAY_URL,
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function isAlreadyUploaded(cid, { timeout, retryCount, gatewayUrl } = DEFAULT_OPTIONS) {
    const cid32 = cidToString(cid);
    const urlToCheck = `${gatewayUrl}/ipfs/${cid32}`;
    for (let i = 0; i < retryCount; i++) {
        try {
            const res = await fetch(urlToCheck, { method: 'HEAD', signal: timeoutSignal(timeout) });
            if (res.status === 200) {
                console.log('Block', cid32, 'already exists on chain, skipping');
                return true;
            }

            if (res.status !== 404) {
                throw new Error(`Unexpected status code ${res.status} for ${urlToCheck}`);
            }
        } catch (e) {
            // Handle AbortError
            if (e.name === 'AbortError') {
                console.log('Timeout while checking', urlToCheck);
                continue;
            }
            throw e;
        }
    }

    return false;
}

function splitOnBatches(newBlocks) {
    let currentBatch = [];
    const batches = [currentBatch];
    const MAX_BATCH_ACTIONS = 7;
    const MAX_BATCH_BYTES = 256 * 1024;
    for (let { data } of newBlocks) {
        if (currentBatch.length >= MAX_BATCH_ACTIONS || currentBatch.reduce((a, b) => a + b.length, 0) >= MAX_BATCH_BYTES) {
            currentBatch = [];
            batches.push(currentBatch);
        }

        currentBatch.push(data);
    }
    return batches;
}

async function deployNEARFS(account, carBuffer, options = DEFAULT_OPTIONS) {
    console.log('Uploading CAR file to NEAR File System...');

    const blocks = readCAR(carBuffer).slice(1).map(b => readBlock(b.data));
    const TRHOTTLE_MS = 25;
    const blocksAndStatus = (await Promise.all(blocks.map(async ({ data, cid }, i) => ({ data, cid, uploaded: (await sleep(i * TRHOTTLE_MS), await isAlreadyUploaded(cid, options)) }))));
    const batches = splitOnBatches(blocksAndStatus.filter(({ uploaded }) => !uploaded));

    let totalBlocks = batches.reduce((a, b) => a + b.length, 0);
    let currentBlocks = 0;
    for (let batch of batches) {
        try {
            await account.signAndSendTransaction({
                receiverId: account.accountId,
                actions: batch.map(data => transactions.functionCall('fs_store', data, 30 * 10 ** 12, 0))
            });
        } catch (e) {
            if (e.message.includes('Cannot find contract code for account') || e.message.includes('Contract method is not found')) {
                // Expected error
            } else {
                throw e;
            }
        }

        currentBlocks += batch.length;
        console.log(`Uploaded ${currentBlocks} / ${totalBlocks} blocks to NEARFS`);
    }
}

module.exports = {
    deployNEARFS
}