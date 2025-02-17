const timeoutSignal = require('timeout-signal');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkIPFSGateways(cids) {
    const IPFS_GATEWAY_LIST = (process.env.IPFS_GATEWAY_LIST || 'cloudflare-ipfs.com').split(',');
    const IPFS_CHECK_DELAY = 15000;

    await Promise.all(IPFS_GATEWAY_LIST.map(async (gateway) => {
        const remainingCids = [...cids];
        do {
            console.log(gateway, 'remaining files', remainingCids.length);
            const cid32 = remainingCids.shift();
            const urlToCheck = gateway.startsWith('http') ? `${gateway}/ipfs/${cid32}/` : `https://${gateway}/ipfs/${cid32}/`;
            console.log(`Checking ${urlToCheck}...`);
            try {
                const res = await fetch(urlToCheck, { signal: timeoutSignal(5000) });
                console.log(res.status, urlToCheck);
                if (res.status == 429) {
                    console.log('Too many requests, sleeping...');
                    await sleep(IPFS_CHECK_DELAY);
                }
                if (!res.ok) {
                    console.log('Error while fetching', urlToCheck, res.status, res.statusText);
                    remainingCids.push(cid32);
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    remainingCids.splice(0, 0, cid32);
                    console.log(`${urlToCheck} timeout, retrying after extra delay...`);
                    await sleep(IPFS_CHECK_DELAY);
                } else {
                    remainingCids.push(cid32);
                    console.error(urlToCheck, e);
                }
            }
        } while (remainingCids.length > 0);
    }));
}

module.exports = {
    checkIPFSGateways
}
