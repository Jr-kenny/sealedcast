# iExec Nox Integration Feedback

## Project context

OpenCast Sealed Casts adds confidential audience gating to the existing
open-source Farcaster client. Creators publish AES-256-GCM encrypted content and
define an audience using Ethereum wallet addresses. Readers privately bind up to
five qualification wallets to their Farcaster identity. iExec Nox compares both
sides without exposing the wallet lists or the result on-chain.

- Application: OpenCast
- Feature: Sealed Casts
- Target network: Ethereum Sepolia (`11155111`)
- Contract: `packages/contracts/contracts/SealedCastRegistry.sol`

## Tools used

We used:

- `@iexec-nox/nox-protocol-contracts` for encrypted Solidity types, encrypted
  comparisons, selection, ACLs, and external input validation.
- `@iexec-nox/handle` for encrypting contract inputs and decrypting
  reader-authorized result handles.
- The Nox Ethereum Sepolia deployment exposed by the protocol SDK.

## What worked well

### Encrypted handles compose naturally

The handle model is a strong fit for reusable private identity. A qualification
wallet is encrypted once, stored as an `euint256`, and reused across many access
checks. This prevents creators from learning every wallet associated with a
Farcaster account.

### Confidential selection prevents access-result leakage

The registry accumulates an encrypted result with `Nox.select`. A qualified
reader receives the encrypted content key; an unqualified reader receives an
encrypted zero. Both requests have the same public transaction shape, so the
contract does not emit a public eligibility boolean.

### Viewer authorization is useful

`Nox.allow(result, reader)` makes the result decryptable only by the requesting
embedded reader key. It maps well to a normal product UX: the feed checks access
automatically and only the intended client can decrypt the response.

### Input proofs provide an important boundary

`Nox.fromExternal` binds encrypted inputs to the submitting account and target
contract. This blocks a caller from copying arbitrary encrypted handles into the
registry without a valid input proof.

## Friction and suggested improvements

### Package documentation and paths

The Solidity SDK is located at `contracts/sdk/Nox.sol`, while package examples
and mental models can lead developers to expect `contracts/Nox.sol`. A
copy-pasteable installation and import section in the package README would avoid
this initial failure.

### Boolean composition

The SDK exposes encrypted comparisons and typed `select`, but no direct
`select(ebool, ebool, ebool)` or obvious boolean OR helper. We accumulated the
encrypted content-key result directly instead. That works, but an encrypted
boolean-composition example would make multi-condition policies easier to
design.

### Network configuration

Nox supports multiple test networks, but hackathon requirements specifically
mandate Ethereum Sepolia. Network-specific quick starts showing chain ID,
gateway/compute address, RPC variables, and a minimal deploy command would
reduce accidental Arbitrum Sepolia targeting.

### End-to-end example

Examples tend to show a single encrypted value. A complete reference covering:

1. client-side `encryptInput`;
2. contract-side `fromExternal`;
3. confidential comparison and selection;
4. `allow` for a reader;
5. client-side `decrypt`;

would significantly shorten integration time.

### Error diagnostics

Failures involving an input proof, account mismatch, unsupported chain, or
viewer permission can look similar at the application layer. Structured SDK
errors with a stable error code and remediation hint would make production
support much easier.

The JavaScript handle package currently pulls `graphql-request`, whose supported
peer range ends at GraphQL 16. A GraphQL 17 installation failed only when the
production wallet-binding route dynamically loaded the Nox client. Next.js
standalone tracing also omitted that runtime-only dependency until the route
explicitly included the GraphQL package files. Publishing the supported peer
range and a Next.js standalone example would prevent this deployment-only
failure.

## Security and product observations

- Message encryption alone is not private access control. Nox protects the
  qualification inputs and access decision, while AES-GCM protects content.
- Wallet ownership is proven using a short-lived signature before the wallet is
  encrypted and bound.
- Farcaster authentication and wallet ownership are separate proofs.
- Public cast text contains only a locked-state hint and an opaque Sealed Cast
  reference. Plaintext is never submitted to Farcaster.
- The application uses an embedded per-FID reader key so feed access feels
  automatic rather than requiring a wallet popup for every cast.
- Users can unbind and replace any of five wallet slots.

## Overall assessment

Nox enables a privacy property that cannot be achieved with conventional
encrypted messaging alone: a contract can enforce audience membership without
publishing the audience wallets or a readable eligibility result. The core
primitives are effective. The biggest opportunity is documentation that joins
the Solidity and JavaScript SDKs into one current, network-specific,
end-to-end example.
