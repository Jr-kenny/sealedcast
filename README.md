# SealedCast

**Private, rule-gated Farcaster posts, powered by iExec Nox and built on OpenCast.**

SealedCast lets a creator publish an encrypted cast whose content opens only for readers who satisfy the creator's access policy. A rule can use a wallet holding, Discord identity, or Farcaster account fact. The creator may publish the rule or keep it hidden.

The public Farcaster cast contains a locked preview and a SealedCast link. The plaintext stays encrypted, and eligible readers open it inside the normal feed without disclosing their linked wallets to the creator.

**Hackathon reviewers:** read the detailed [iExec Nox integration feedback](feedback.md), inspect the [live application](https://sealedcast.vercel.app), and review the [Sepolia contract](https://sepolia.etherscan.io/address/0xbc16dec22be4b109dab6a830b32c95549e2e6cda).

## Why this exists

Farcaster is public by design. That makes it composable, but it gives creators no native way to share one cast with a qualified audience while keeping both the content and the access decision private.

SealedCast adds that layer without changing Farcaster. It keeps the public cast and social graph intact, then uses encrypted content, private identity binding, source checks, and a Nox contract on Ethereum Sepolia to control access.

## How it works

```text
Creator
  |
  | writes plaintext and chooses ALL or ANY access rules
  v
Browser encrypts plaintext with a fresh AES-256-GCM content key
  |
  +--> Farcaster receives only a locked preview and /sealed/:id link
  |
  +--> AWS stores ciphertext, policy, and encrypted identity links
  |
  +--> Nox registry stores the encrypted content key and policy commitment
            |
Reader opens feed, SealedCast checks linked identities in the background
            |
AWS verifies current wallet, Discord, and Farcaster facts
            |
AWS signs a short-lived eligibility attestation
            |
Nox.select returns encrypted content key or encrypted zero
            |
Only the reader's local per-FID key can decrypt the authorized result
```

### Creator flow

1. Sign in with the creator's own Farcaster account through Neynar SIWN.
2. Write a cast and turn on **Seal this cast**.
3. Add up to five access requirements and choose whether every rule or any rule must pass.
4. Choose whether the requirement summary is public or hidden.
5. Publish. SealedCast encrypts the plaintext before it is stored and posts the locked reference to Farcaster.

The creator always receives access to their own cast. Creator access still passes through the Nox result and reader-key flow.

### Reader flow

1. Sign in with Farcaster.
2. Link up to five wallets and optionally connect Discord.
3. Scroll normally. SealedCast checks the next locked post in the background.
4. Qualifying content opens automatically. A locked card explains why unavailable content is hidden and shows public requirements when the creator chose to reveal them.

Wallet slots are one qualification set. A creator targets an asset or contract, then SealedCast checks whether any wallet linked to that reader satisfies the rule. The slots are not separate NFT, token, or DeFi wallet categories.

## Access requirements

| Source    | Requirement              | How it is checked                                  |
| --------- | ------------------------ | -------------------------------------------------- |
| Wallet    | Minimum ERC-20 balance   | Current balance across the reader's linked wallets |
| Wallet    | NFT collection ownership | Current collection balance across linked wallets   |
| Discord   | Server membership        | OAuth-authorized guild membership                  |
| Discord   | Required role            | Current member roles in the selected server        |
| Discord   | Account age              | Age derived from the Discord snowflake             |
| Farcaster | Following an account     | Current viewer relationship from Neynar            |
| Farcaster | Account age              | Farcaster registration date from Neynar            |
| Farcaster | Minimum followers        | Current follower count from Neynar                 |

Policies use `ALL` or `ANY` logic. The backend validates the policy, evaluates fresh source facts, and signs an attestation bound to the cast ID, reader, FID, policy hash, nonce, and expiry.

## Privacy and trust model

| Data                  | Protection                                                                      |
| --------------------- | ------------------------------------------------------------------------------- |
| Cast plaintext        | Encrypted in the creator's browser with AES-256-GCM                             |
| Content key           | Imported as a Nox encrypted handle and never posted to Farcaster                |
| Access result         | Selected confidentially with `Nox.select`, without a public eligibility boolean |
| Reader result         | Authorized with `Nox.allow` to the reader's per-FID address                     |
| Linked wallets        | Ownership-proven, encrypted at rest, and represented on-chain as Nox handles    |
| Discord tokens        | AES-256-GCM encrypted at rest and never returned after OAuth callback           |
| Public Farcaster post | Locked text, optional public requirement hint, and opaque SealedCast URL        |

The AWS backend is trusted to query external sources and attest their results honestly. Nox protects encrypted contract inputs, the stored content key, and the access selection. Nox does not query Neynar, Discord, or token contracts by itself. A hidden policy remains available to the backend for evaluation but is not shown to the reader.

## Live deployment

| Component              | Deployment                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web application        | [sealedcast.vercel.app](https://sealedcast.vercel.app)                                                                                                                     |
| Stateful API           | [AWS health check](https://16-59-248-112.sslip.io/api/health)                                                                                                              |
| Network                | Ethereum Sepolia, chain ID `11155111`                                                                                                                                      |
| Nox registry           | [`0xbc16dec22be4b109dab6a830b32c95549e2e6cda`](https://sepolia.etherscan.io/address/0xbc16dec22be4b109dab6a830b32c95549e2e6cda)                                            |
| Deployment transaction | [`0xc8410ea9c02484269f8dbd2ffa0fd705b6b47710ddd5e0db0267a215f748c894`](https://sepolia.etherscan.io/tx/0xc8410ea9c02484269f8dbd2ffa0fd705b6b47710ddd5e0db0267a215f748c894) |
| Source                 | [Jr-kenny/sealedcast](https://github.com/Jr-kenny/sealedcast)                                                                                                              |

Vercel serves the Next.js interface and rewrites stateful `/api` requests to AWS. The AWS host runs Caddy, the Next.js API, PostgreSQL, and Redis. Neynar provides Farcaster sign-in, reads, and writes. Production does not run a full Farcaster hub indexer.

Pushes to `main` deploy automatically through the connected Vercel project. AWS configuration is loaded from Systems Manager Parameter Store under `/sealedcast/production`.

## Existing work and hackathon scope

SealedCast uses [OpenCast](https://github.com/stephancill/opencast) as its open-source Farcaster client base. The imported base is commit [`e8343c07`](https://github.com/stephancill/opencast/commit/e8343c07). OpenCast and its contributors provided the feed, profile, navigation, and original client structure.

Work completed for SealedCast includes:

- independent SealedCast branding and repository history;
- a hosted Vercel and AWS architecture for a publicly usable application;
- Neynar SIWN, live Farcaster reads, search, feeds, profiles, and writes;
- browser-side cast encryption and locked Farcaster embeds;
- an iExec Nox registry, encrypted handles, private selection, reader ACLs, and Sepolia deployment;
- private multi-wallet binding with ownership signatures and sponsored reader transactions;
- Discord OAuth identity binding with encrypted tokens;
- wallet, Discord, and Farcaster policy evaluation;
- public or hidden requirement summaries and locked-content help UI;
- PostgreSQL persistence, AWS deployment automation, tests, and production documentation.

See [UPSTREAM.md](UPSTREAM.md) for exact attribution and license details.
The required developer feedback is available directly at [feedback.md](feedback.md).

## Run locally

### Requirements

- Node.js 20 or newer
- npm
- Docker with Compose
- Ethereum Sepolia RPC access
- Neynar app credentials
- Reown project ID
- Discord OAuth credentials if testing Discord rules

### 1. Install

```bash
git clone https://github.com/Jr-kenny/sealedcast.git
cd sealedcast
npm install
npm --prefix packages/contracts install
```

### 2. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

### 3. Configure the app

```bash
cp .env.dev.sample .env.local
```

Set the required values in `.env.local`:

| Variable                                   | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `DATABASE_URL`                             | PostgreSQL connection used by Prisma     |
| `NEXT_PUBLIC_URL`                          | Local or deployed application origin     |
| `NEXT_PUBLIC_NEYNAR_CLIENT_ID`             | Neynar SIWN client ID                    |
| `NEYNAR_API_KEY`                           | Server-only Neynar API key               |
| `NEXT_PUBLIC_WALLETCONNECT_ID`             | Reown project ID                         |
| `DISCORD_CLIENT_ID`                        | Discord OAuth client ID                  |
| `DISCORD_CLIENT_SECRET`                    | Server-only Discord OAuth secret         |
| `DISCORD_REDIRECT_URI`                     | Exact Discord callback URL               |
| `DISCORD_TOKEN_ENCRYPTION_KEY`             | Base64 32-byte key for OAuth tokens      |
| `SEALED_IDENTITY_ENCRYPTION_KEY`           | Base64 32-byte key for linked identities |
| `SEPOLIA_RPC_URL`                          | Server-side Ethereum Sepolia RPC         |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL`              | Browser Ethereum Sepolia RPC             |
| `SEALED_CAST_REGISTRY_ADDRESS`             | Deployed SealedCast registry             |
| `NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS` | Public copy of registry address          |
| `SEALED_CAST_RELAYER_PRIVATE_KEY`          | Server-only relayer and sponsor key      |
| `SEALED_CAST_WALLET_VERIFIER_PRIVATE_KEY`  | Server-only policy attestation signer    |

Generate the two application encryption keys separately:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Never expose API keys, OAuth secrets, encryption keys, or private keys through a `NEXT_PUBLIC_` variable.

### 4. Prepare the database and start

```bash
npx prisma migrate deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000). Add `http://localhost:3000` to Neynar SIWN authorized origins and use `http://localhost:3000/api/auth/discord/callback` as the local Discord redirect URI.

## Contracts

The contract package uses Solidity 0.8.35, Hardhat 3, `@iexec-nox/nox-protocol-contracts`, and `@iexec-nox/handle`.

```bash
npm --prefix packages/contracts run build
npm --prefix packages/contracts test
```

Deploy a fresh registry to Ethereum Sepolia:

```bash
export SEPOLIA_RPC_URL="https://..."
export DEPLOYER_PRIVATE_KEY="0x..."
export WALLET_VERIFIER_ADDRESS="0x..."
export FIRST_CAST_ID="1"
npm --prefix packages/contracts run deploy:sepolia
```

Copy the deployed address into both registry environment variables. The verifier private key must match `WALLET_VERIFIER_ADDRESS`.

## Verification

```bash
npm run format
npm run lint
npm run test:ci
npm run build
npm --prefix packages/contracts test
```

The test suite covers policy validation, wallet signatures, identity encryption, Discord OAuth state and token storage, creator access, Nox client integration boundaries, and live-source Farcaster policy evaluation through a mocked provider.

## Production deployment

The AWS backend deployment script reads `/sealedcast/production/*` from Parameter Store, writes a root-readable environment file, builds the production containers, applies Prisma migrations, and waits for the HTTPS health check.

```bash
sudo /opt/sealedcast/infra/aws/deploy-production.sh
```

The production Compose file keeps the inherited OpenCast hub proxy and lazy indexer behind explicit profiles. They are disabled because SealedCast production uses Neynar directly and does not need to replay the full Farcaster event stream.

## Repository map

```text
src/components/sealed-casts/        Creator, reader, wallet, and Discord UI
src/lib/sealed-casts/               Encryption, policies, attestations, and Nox client
src/pages/api/sealed-casts/         Stateful SealedCast API routes
src/pages/api/auth/discord/         Discord OAuth routes
packages/contracts/                 Solidity registry, deploy scripts, and tests
prisma/                             Database schema and migrations
infra/aws/                          Production Compose, Caddy, and deployment scripts
feedback.md                         iExec Nox developer feedback
UPSTREAM.md                         OpenCast attribution and imported scope
```

## Known limits

- External wallet and social facts are attested by the SealedCast backend. This is a clear trust boundary, not an independent Nox oracle.
- A reader key is local to one browser and Farcaster FID. A new device needs a new sponsored reader registration. Sponsorship is limited to three reader addresses per FID.
- Ethereum Sepolia requests require transaction confirmation, so first access on a device can take longer than later reads.
- Historical cast ID `1` was created before persistent Nox ACL permissions were corrected. Its original content key cannot be recovered. New casts use the corrected registry flow.

## License and attribution

SealedCast is open source under the repository's [MIT license](LICENSE). OpenCast is credited in [UPSTREAM.md](UPSTREAM.md), including the imported commit and upstream authors. The original MIT copyright notice remains intact.

## Three things worth remembering

1. Farcaster remains the public social and distribution layer.
2. The plaintext and access result stay private through browser encryption and Nox.
3. Readers qualify with identities they already own, then sealed content opens naturally in the feed.
