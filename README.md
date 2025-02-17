# web4-deploy

Deploy static content for Web4 webapps. Supports IPFS and NEARFS.

Designed to be used together with https://github.com/vgrichina/web4.

## Usage

### Prerequisites

- Node.js 14 or higher
- (Optional) IPFS pinning service API key if not using NEARFS

#### IPFS Pinning Services

If you want to use IPFS pinning (optional, as NEARFS is the default), two services are supported:

##### web3.storage

1. Go to https://web3.storage and sign up for an account or login with GitHub
2. Go to https://web3.storage/docs/how-tos/generate-api-token/ and create a new token
3. Set the token as `WEB3_TOKEN` environment variable before running the script

##### Estuary

1. Visit https://docs.estuary.tech/tutorial-get-an-api-key
2. Follow instructions to get an API token
3. Set the token as `ESTUARY_TOKEN` environment variable before running the script

### Deploy to IPFS

When installed (use either npm or yarn):

```sh
web4-deploy <src-directory> <destination-account.near>
```

Run latest version from npm if not installed:

```sh
npx web4-deploy <src-directory> <destination-account.near>
```

Deploy default smart contract after uploading to IPFS:

```sh
npx web4-deploy <src-directory> <destination-account.near> --deploy-contract
```

This gonna deploy [web4-min-contract](https://github.com/vgrichina/web4-min-contract) to the account, so that `.near` account can be connected to respective IPFS hash.

Deploy custom smart contract after uploading to IPFS:

```sh
npx web4-deploy <src-directory> <destination-account.near> --deploy-contract path/to/contract.wasm
```

### Deploy fully on-chain to NEARFS

When you want best availability guarantees and don't mind to pay for storage, you can deploy to [NEARFS](https://github.com/vgrichina/nearfs).

```sh
npx web4-deploy <src-directory> <destination-account.near>  --nearfs
```

Note that you need to either provide `NEAR_SIGNER_KEY` or have `~/.near-credentials/<networkId>/<destination-account.near>.json` file with key. Use `NEAR_ENV` or `NODE_ENV` to specify NEAR network to use. Defaults to `testnet`.

### Use in CI/CD pipeline like GitHub Actions

Make sure to store `WEB3_TOKEN`, `ESTUARY_TOKEN` and `NEAR_SIGNER_KEY` as GitHub secrets.

`NEAR_SIGNER_KEY` allows you to pass necessary private key to the deploy script without having key storage in `~/near-credentials` as usually required by `near-cli`.

Note that you don't have to sign using destination account, account you sign for should just be accepted as valid owner by `web4_setStaticUrl` method.

Means that you can have GitHub-specific account which cannot do anything else besides updating static content.

### CLI Options

- `--deploy-contract [contract-name]`: Deploy contract to the account. If contract name is not provided, default contract will be deployed.
- `--network [network]`: NEAR network ID. Default: mainnet for .near accounts, testnet otherwise.
- `--nearfs`: Deploy to NEARFS instead of IPFS. Enabled by default.
- `--estuary`: Use Estuary for IPFS pinning.
- `--web3-storage`: Use web3.storage for IPFS pinning.
- `--yes`: Skip confirmation prompt.

### Environment Variables

#### NEAR Configuration
- `NEAR_ENV` – NEAR network to use, defaults to `testnet` (or `mainnet` for .near accounts)
- `NODE_ENV` - can be used instead of `NEAR_ENV`
- `NEAR_SIGNER_ACCOUNT` - Account to use for signing transactions. Defaults to destination account
- `NEAR_SIGNER_KEY` - Private key for signing (base58-encoded, starts with 'ed25519:'). Alternative to ~/.near-credentials

#### NEARFS Configuration (Default Storage)
- `NEARFS_GATEWAY_URL` - Gateway URL. Defaults to:
  - Mainnet: https://ipfs.web4.near.page
  - Testnet: https://ipfs.web4.testnet.page
- `NEARFS_GATEWAY_TIMEOUT` - Gateway request timeout in milliseconds (default: 2500)
- `NEARFS_GATEWAY_RETRY_COUNT` - Maximum gateway retry attempts (default: 3)

#### IPFS Configuration (Optional)
- `WEB3_TOKEN` - web3.storage API token
- `ESTUARY_TOKEN` - Estuary API token
- `IPFS_GATEWAY_LIST` - Comma-separated list of IPFS gateways to hydrate

## Development

### WebAssembly Contract Diffs

The repository includes WebAssembly diff support to make contract changes more visible. To enable this feature, install the WebAssembly Binary Toolkit (WABT):

```bash
# Ubuntu/Debian
sudo apt install wabt
# macOS
brew install wabt
```

This allows you to see readable diffs when the default contract (`data/web4-min.wasm`) changes.

## How it works

The deployment process consists of these steps:

1. Your static content is packaged into a CAR (Content Addressable aRchive) file
2. The content is deployed using one of these methods:
   - NEARFS (default) - stores content directly on NEAR blockchain
   - web3.storage - pins content to IPFS network
   - Estuary - pins content to IPFS network
3. The smart contract's `web4_setStaticUrl` method is called to update the content URL

Note: The deployment requires appropriate access to the smart contract account. This can be provided either through:
- Full access key in ~/.near-credentials
- NEAR_SIGNER_KEY environment variable

## Smart contract integration

You need to implement `web4_setStaticUrl` method similar to this:

```ts
function assertOwner(): void {
    // NOTE: Can change this check to alow different owners
    assert(context.sender == context.contractName);
}

const WEB4_STATIC_URL_KEY = 'web4:staticUrl';

// Updates current static content URL in smart contract storage
export function web4_setStaticUrl(url: string): void {
    assertOwner();

    storage.set(WEB4_STATIC_URL_KEY, url);
}
```

Then in `web4_get` you can return static URL to be fetched:

```ts
// Demonstrate serving content from IPFS
if (request.path == "/") {
    return bodyUrl(`${storage.getString(WEB4_STATIC_URL_KEY)!}${request.path}`);
}

```

This allows to update static content without redeploying smart contract, which results in faster and safer deploys.

See example smart contract: https://github.com/vgrichina/web4/blob/main/contract/assembly/index.ts

You can also use defaulr smart contract for reference: https://github.com/vgrichina/web4-min-contract

## Roadmap

- [x] Make sure every uploaded file is hot on IPFS gateways
- [x] Deploy default smart contract with `web4_setStaticUrl` method
- [x] Allow to pass NEAR account and private key in environment variables
- [ ] More robust CLI interface with both options and environment variables support
- [x] Deploy static website to NEAR account and NEARFS via single simple interactive command
- [ ] Automatically login without having to install near-cli
- [ ] Allow to create web4. subaccount automatically
- [x] Support testnet for NEARFS
- [x] Allow storing files directly on chain
- [ ] Support other storage providers?
