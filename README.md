# SealedCast

Sealed Casts adds iExec Nox-powered confidential audience gating to OpenCast.
Creators encrypt a cast for up to five wallet addresses; readers privately bind
up to five wallets and see qualifying casts automatically.

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

Readers can privately bind five wallets according to how they use them:

1. Primary wallet
2. Collectibles wallet
3. Token wallet
4. DeFi wallet
5. Additional wallet

Each binding requires a short-lived ownership signature. The signature moves no
funds, the relayer sponsors the Sepolia transaction, and the address is stored as
a Nox encrypted handle.

The current deployed registry supports confidential matching against exact
wallet addresses. The next qualification-engine layer extends the same flow to
verifiable wallet holdings and activity, Discord membership and account facts,
and Farcaster relationship and account facts. A creator can choose whether the
requirement is shown publicly or remains hidden. The project does not present
those additional rule types as active until their source checks and Nox access
path work end to end.

This project is built on [OpenCast](https://github.com/stephancill/opencast),
using upstream commit [`e8343c07`](https://github.com/stephancill/opencast/commit/e8343c07)
as its base. The repository keeps an independent history so the Sealed Casts
integration is easy to review. See [UPSTREAM.md](UPSTREAM.md) for the source,
license, and a summary of the privacy features added here.

### Ethereum Sepolia deployment

The live SealedCast registry is deployed on Ethereum Sepolia at
[`0x3c3c34f06e50e734d041338a2a200193384bee24`](https://sepolia.etherscan.io/address/0x3c3c34f06e50e734d041338a2a200193384bee24).
Its deployment transaction is
[`0x3536f781f9c6cfe564a7ff72ede76a325d1f40268d3e62340101ab21e943d33c`](https://sepolia.etherscan.io/tx/0x3536f781f9c6cfe564a7ff72ede76a325d1f40268d3e62340101ab21e943d33c).

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
