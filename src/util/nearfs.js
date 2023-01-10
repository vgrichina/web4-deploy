const { uploadCAR } = require('nearfs/src/util/upload');

const NEARFS_GATEWAY_URL = process.env.NEARFS_GATEWAY_URL || 'https://ipfs.web4.near.page';
const NEARFS_GATEWAY_TIMEOUT = parseInt(process.env.NEARFS_GATEWAY_TIMEOUT || '2500');
const NEARFS_GATEWAY_RETRY_COUNT = parseInt(process.env.NEARFS_GATEWAY_RETRY_COUNT || '3');

const DEFAULT_OPTIONS = {
    log: console.log,
    timeout: NEARFS_GATEWAY_TIMEOUT,
    retryCount: NEARFS_GATEWAY_RETRY_COUNT,
    gatewayUrl: NEARFS_GATEWAY_URL,
};

function deployNEARFS(account, carBuffer, options = DEFAULT_OPTIONS) {
    return uploadCAR(account, carBuffer, options);
}

module.exports = {
    deployNEARFS
}