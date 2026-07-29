# iExec Nox developer tooling: my feedback log

I built SealedCast by adding confidential, rule-gated posts to the existing OpenCast Farcaster client. The application encrypts cast content in the browser, verifies current wallet and social facts, and uses iExec Nox on Ethereum Sepolia to release a content key only to an eligible reader.

This log records the concrete integration problems I encountered on July 28 and 29, 2026. Each entry includes the behavior I saw and the change that would have saved time.

## The Solidity import path was harder to find than expected

**Area:** Solidity SDK and package documentation, July 28, 2026

The package name is `@iexec-nox/nox-protocol-contracts`, but the contract import I needed lives under `contracts/sdk/Nox.sol`. I first looked for a shorter `contracts/Nox.sol` path because that is the shape many Solidity packages use.

The package README should begin with one copyable install, import, compile, and deploy example using the exact published path. A small table of the public Solidity entry points would also make package exploration faster.

## Persistent encrypted handles need explicit ACL guidance

**Area:** Nox permissions and contract lifecycle, July 28, 2026

My first registry accepted an encrypted content key during cast creation, and the transaction succeeded. A later access request reverted with `NotAllowed(bytes32,address)`, selector `0xb87a12a9`, because the stored handle had not been granted a persistent permission with `Nox.allowThis(contentKey)`.

This failure appeared well after the transaction that caused it. The original key could not be recovered after the contract was replaced, which made the first historical cast unreadable.

The documentation needs a storage lifecycle section that clearly says which permissions are required when a handle survives the current call. A compiler helper, static check, or explicit runtime error such as `StoredHandleMissingContractPermission` would make this much safer.

## The JavaScript handle package failed only in the production bundle

**Area:** JavaScript SDK dependencies, July 28, 2026

The local application compiled, but the deployed wallet-binding route failed with:

```text
Cannot find module '/app/node_modules/graphql/index.mjs' imported from
/app/node_modules/graphql-request/build/legacy/lib/graphql.js
```

The failure involved the GraphQL version accepted by `graphql-request` and a Nox client import that was loaded only on the server route. It was easy to miss in local UI testing.

The package should publish its tested Node.js, GraphQL, and `graphql-request` versions as explicit peer or compatibility information. A minimal Next.js example should also be tested in CI against the published package.

## Next.js standalone tracing missed runtime Nox dependencies

**Area:** Framework deployment, July 28, 2026

Next.js standalone output did not include every file required by the Nox wallet-binding path. The page build completed, but the AWS runtime failed when that route dynamically loaded the client. I had to add explicit output-file tracing includes for the GraphQL runtime files.

A documented `next.config.js` example for standalone output would help teams deploying to containers, Vercel functions, or AWS. A tiny production smoke test that imports the Nox handle client from the built output would catch this class of failure before deployment.

## A full encrypted-value lifecycle example is missing

**Area:** End-to-end documentation, July 28, 2026

Individual examples explain one primitive at a time. SealedCast needed the whole lifecycle:

1. encrypt a client input;
2. validate it with `Nox.fromExternal`;
3. persist the encrypted handle with the correct ACL;
4. select the content key or encrypted zero with `Nox.select`;
5. authorize the result with `Nox.allow`;
6. decrypt only from the intended reader address.

One official repository that connects those six steps on Ethereum Sepolia would remove a lot of trial and error. It should include a positive test, an ineligible-reader test, and a missing-permission test.

## External qualification needs an official attestation pattern

**Area:** Privacy architecture and public protocol data, July 28, 2026

SealedCast checks token balances, NFT ownership, Discord membership, and Farcaster facts. Those sources live outside the Nox contract. I implemented a short-lived signed attestation bound to the cast ID, reader address, Farcaster FID, policy commitment, nonce, and expiry, then imported the encrypted eligibility value into the registry.

An official pattern for this boundary would help teams avoid creating incompatible or replayable schemes. The guide should cover signer rotation, nonce use, expiry, domain separation, policy commitments, replay protection, and which trust claims Nox does and does not provide.

## Error messages need to separate proof, permission, signer, and network failures

**Area:** SDK diagnostics, July 28, 2026

During development, an invalid external-input proof, a wrong account, a missing ACL, a verifier mismatch, and a wrong network could all reach the application as a failed transaction or an opaque contract error. The useful `NotAllowed` selector was visible only after inspecting the low-level revert.

Stable SDK error codes with a short remediation hint would make support much easier. Suggested categories include invalid input proof, handle not allowed for contract, result not allowed for reader, verifier signature invalid, expired attestation, unsupported chain, and compute service unavailable.

## Ethereum Sepolia needs one canonical configuration checklist

**Area:** Network setup, July 28, 2026

The hackathon required Ethereum Sepolia, while examples and package assumptions can point developers toward different test networks. The integration needs several values to agree: chain ID, RPC, Nox deployment, registry address, verifier address, relayer key, and browser network.

A network page with the current chain ID, deployed protocol addresses, supported package versions, a faucet link, and one deploy command would reduce accidental cross-network configuration.

## Testnet latency needs a product UX recommendation

**Area:** User experience, July 29, 2026

SealedCast checks access while the reader scrolls. A first reader registration or access request can take long enough that the card initially says the private access check is unavailable. That is understandable at the chain layer, but it is confusing in a social feed.

The SDK documentation should recommend an asynchronous UI state model for submitted, confirming, authorized, decrypting, retryable failure, and final denial. Guidance on safe polling intervals and transaction replacement would help teams build a clear product around testnet confirmation time.

## What worked well

The encrypted handle model fits reusable private identity well. `Nox.select` lets SealedCast return the same public transaction shape for an eligible and ineligible reader, without emitting a readable access boolean. `Nox.allow` maps cleanly to a reader-specific browser key, and `Nox.fromExternal` provides a useful boundary for authenticated encrypted inputs.

The strongest part of Nox is that the contract can enforce a confidential selection while the application remains composable with a public protocol. More end-to-end examples, stronger dependency packaging, and clearer ACL diagnostics would make that value much easier to reach in a production-style application.

## Integration summary

- **Application base:** OpenCast
- **Privacy feature:** encrypted, policy-gated Farcaster casts
- **Network:** Ethereum Sepolia, chain ID `11155111`
- **Contract:** `packages/contracts/contracts/SealedCastRegistry.sol`
- **Nox packages:** `@iexec-nox/nox-protocol-contracts` and `@iexec-nox/handle`
- **Live registry:** `0xbc16dec22be4b109dab6a830b32c95549e2e6cda`
