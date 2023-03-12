# web4-deploy

Deploy static content for Web4 webapps. Supports IPFS and NEARFS.

Designed to be used together with https://github.com/vgrichina/web4.

## Usage

### Obtain IPFS pinning API key (if not using NEARFS)

2 different pinning services are supported for now.

#### web3.storage

Go to https://web3.storage and sign up for an account or login with GitHub.
Then go to https://web3.storage/docs/how-tos/generate-api-token/ and create a new token.

This token needs to be set as `WEB3_STORAGE_TOKEN` environment variable before running the script.

#### Estuary

See https://docs.estuary.tech/tutorial-get-an-api-key for more information.

This token needs to be set as `ESTUARY_API_KEY` environment variable before running the script.

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
NEAR_ENV=mainnet npx web4-deploy <src-directory> <destination-account.near>  --nearfs
```

`NEAR_ENV` is set to `mainnet` in this example as [NEARFS](https://github.com/vgrichina/nearfs) currently only runs mainnet indexer.

Note that you need to either provide `NEAR_SIGNER_KEY` or have `~/.near-credentials/<networkId>/<destination-account.near>.json` file with key. Use `NEAR_ENV` or `NODE_ENV` to specify NEAR network to use. Defaults to `testnet`.

### Use in CI/CD pipeline like GitHub Actions

Make sure to store `WEB3_STORAGE_TOKEN`, `ESTUARY_TOKEN` and `NEAR_SIGNER_KEY` as GitHub secrets.

`NEAR_SIGNER_KEY` allows you to pass necessary private key to the deploy script without having key storage in `~/near-credentials` as usually required by `near-cli`.

Note that you don't have to sign using destination account, account you sign for should just be accepted as valid owner by `web4_setStaticUrl` method.

Means that you can have GitHub-specific account which cannot do anything else besides updating static content.

### Environment variables

- `WEB3_STORAGE_TOKEN` - web3.storage API token. See https://web3.storage/docs/how-tos/generate-api-token/ for more information.
- `ESTUARY_TOKEN` - Estuary API token. See https://docs.estuary.tech/tutorial-get-an-api-key for more information.
- `NEAR_ENV` – NEAR network to use, defaults to `testnet`
- `NODE_ENV` - can be used instead of `NEAR_ENV`
- `IPFS_GATEWAY_LIST` – comma-separated list of IPFS gateways to hydrate
- `NEAR_SIGNER_ACCOUNT` - NEAR account to use for signing IPFS URL update transaction. Defaults to `<destination-account.near>`.
- `NEAR_SIGNER_KEY` - NEAR account private key to use for signing. Should have base58-encoded key starting with `ed25519:`. Defaults to using key from `~/.near-credentials/`.

## How it works

It does two things:
1) uploads and pins static content on Infura IPFS using [ipfs-deploy](https://github.com/ipfs-shipyard/ipfs-deploy)
2) calls `web4_setStaticUrl` method in smart contract to point to latest IPFS hash to serve

Note that it currently assumes that you have full access key to smart contract account.

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
- [x] Allow storing files directly on chain
- [ ] Support other storage providers?
