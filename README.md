# SealedCast

SealedCast adds iExec Nox-powered confidential access rules to OpenCast.
Creators choose real wallet, Discord, and Farcaster requirements. Readers link
their identities once and see qualifying casts automatically.

## Live application

- Web app: [sealedcast.vercel.app](https://sealedcast.vercel.app)
- Backend health: [16-59-248-112.sslip.io/api/health](https://16-59-248-112.sslip.io/api/health)
- Network: Ethereum Sepolia, chain ID `11155111`

The Next.js frontend runs on Vercel and forwards application API calls to the
AWS backend. Pushes to `main` deploy automatically through the linked Vercel
GitHub project. The stateful backend, PostgreSQL, Redis, Farcaster indexer, and
Nox relayer run on AWS and are deployed with
`infra/aws/deploy-production.sh`.

## Qualification identities

Readers can privately bind up to five wallets. They form one qualification set,
so any linked wallet can satisfy a token, NFT, DeFi, or transaction rule. Wallet
slots are not assigned to asset categories.

Each binding requires a short-lived ownership signature. The signature moves no
funds, the relayer sponsors the Sepolia transaction, and the address is stored as
a Nox encrypted handle on-chain and encrypted at rest for source checks.

Creators can combine up to five requirements with `ALL` or `ANY` logic:

- minimum ERC-20 balance across all linked wallets;
- NFT collection ownership across all linked wallets;
- Discord server membership, role, or account age;
- Farcaster follow relationship, account age, or follower count.

The backend verifies each source, encrypts the single eligibility result for the
registry, and signs a short-lived attestation tied to the cast policy commitment,
reader, FID, nonce, and expiry. Nox selects either the encrypted content key or
encrypted zero without publishing the decision. The creator can show the rule
summary publicly or keep it hidden.

Discord uses OAuth scopes `identify`, `guilds`, and `guilds.members.read`.
Access and refresh tokens are encrypted with AES-256-GCM and never returned to
the browser after the callback.

This project is built on [OpenCast](https://github.com/stephancill/opencast),
using upstream commit [`e8343c07`](https://github.com/stephancill/opencast/commit/e8343c07)
as its base. The repository keeps an independent history so the Sealed Casts
integration is easy to review. See [UPSTREAM.md](UPSTREAM.md) for the source,
license, and a summary of the privacy features added here.

### Ethereum Sepolia deployment

The live SealedCast registry is deployed on Ethereum Sepolia at
[`0xd9067eaa6905dd7ec9ed037d835881a24a92e107`](https://sepolia.etherscan.io/address/0xd9067eaa6905dd7ec9ed037d835881a24a92e107).
Its deployment transaction is
[`0x37ad645ec0ca3a61e87a7a8ea4121f138aab6d65594b7f102130105be4471c0e`](https://sepolia.etherscan.io/tx/0x37ad645ec0ca3a61e87a7a8ea4121f138aab6d65594b7f102130105be4471c0e).

```bash
export SEPOLIA_RPC_URL="https://..."
export DEPLOYER_PRIVATE_KEY="0x..."
export WALLET_VERIFIER_ADDRESS="0x..."
npm --prefix packages/contracts run deploy:sepolia
```

Copy the printed address into `SEALED_CAST_REGISTRY_ADDRESS` and
`NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS`. Configure
`SEALED_CAST_RELAYER_PRIVATE_KEY` and
`SEALED_CAST_WALLET_VERIFIER_PRIVATE_KEY`; the verifier key must correspond to
the verifier address supplied during deployment.

The AWS backend loads production configuration from Parameter Store at
`/sealedcast/production`. On the backend host, deploy the checked-out revision
with:

```bash
sudo /opt/sealedcast/infra/aws/deploy-production.sh
```

The script writes a root-readable environment file, validates the required
parameters, builds the containers, runs the database migrations, and waits for
the HTTPS health check to pass.

A fully open source Twitter flavoured Farcaster client. Originally a fork of [ccrsxx/twitter-clone](https://github.com/ccrsxx/twitter-clone).

The goal of this project is to be a fully standalone Farcaster client that you can run on your own machine. It only depends on [stephancill/lazy-indexer](https://github.com/stephancill/lazy-indexer) and a connection to a Farcaster Hub.

## Running it yourself

### Prerequisites

- [Docker](https://docs.docker.com/engine/install/)

1. Clone the repo

```
git clone git@github.com:Jr-kenny/sealedcast.git
```

2. Copy .env.sample, rename it to .env and fill in the values

```
cp .env.sample .env
```

3. Run the Docker Compose file

```
docker-compose up -d
```

4. Go to SealedCast at http://localhost:3000 and log in. It will take a few moments to index your profile and might require you to refresh the page.

## Development

### Farcaster Indexer

This project depends on the Lazy Farcaster Indexer. Follow the instructions at [https://github.com/stephancill/lazy-indexer](https://github.com/stephancill/lazy-indexer) to set up an instance.

### Local

Install dependencies

```
yarn install
```

Fill in the environment variables

```
cp .env.dev.sample .env
```

Run the development server

```
yarn dev
```

## Todo

- [ ] Feed
  - [x] Reverse chronological feed
  - [x] Pagination
  - [x] Number of likes, comments, and reposts
  - [ ] Recasts
- [x] Cast detail
  - [x] Number of likes, comments, and reposts
  - [x] Paginated replies
- [x] User profiles
  - [x] Casts
  - [x] Casts with replies
  - [ ] Media
  - [x] Likes
  - [ ] Edit profile
- [x] Auth
- [x] Engagement actions
- [x] Post creation
  - [x] Text only
  - [x] Media
  - [x] Mentions
  - [x] Embeds
  - [x] Topic
- [x] Post deletion
- [ ] Search
  - [x] User
  - [ ] Topic
  - [ ] Posts
- [x] Channels (now called Topics)
  - [x] Channel detail
  - [x] Channel discovery
  - [ ] Index channels
- [x] Fix mobile layout
- [ ] Rebrand
  - [x] Renaming (casts -> tweets, etc)
  - [x] Images
  - [ ] Code
- [x] Notifications
  - [x] Badge counter
  - [x] Notifications page
- [ ] Optimize
  - [ ] DB queries
  - [ ] Bandwidth

...
