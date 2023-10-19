const path = require('path');
const fs = require('fs');

async function deployContract(account, contractPath) {
    console.log('Deploying contract...');
    // NOTE: This contract is taken from https://github.com/vgrichina/web4-min-contract
    contractPath = contractPath || path.resolve(__dirname, '../../data/web4-min.wasm');
    const contract = fs.readFileSync(contractPath);

    await account.deployContract(contract);
}

module.exports = {
    deployContract
}