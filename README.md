# web4-deploy

Deploy static content for Web4 webapp. Supports IPFS for now.

Designed to be used together with https://github.com/vgrichina/web4.

## Usage

### Obtain web3.storage API key

Go to https://web3.storage and sign up for an account or login with GitHub.
Then go to https://web3.storage/account/tokens and create a new token.

This token needs to be set as `WEB3_STORAGE_TOKEN` environment variable before running the script.

### Deploy to IPFS


When installed (use either npm or yarn):

```sh
web4-deploy <src-directory> <destination-account.near>
```

Run latest version from npm if not installed:

```sh
npx web4-deploy <src-directory> <destination-account.near>
```

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
