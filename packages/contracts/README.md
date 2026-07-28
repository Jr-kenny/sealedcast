# SealedCast Registry

iExec Nox-powered confidential rule gating for SealedCast.

## Ethereum Sepolia

```bash
export SEPOLIA_RPC_URL="https://..."
export DEPLOYER_PRIVATE_KEY="0x..."
export WALLET_VERIFIER_ADDRESS="0x..."
npm run deploy:sepolia
```

The contract stores qualification wallets and content keys as Nox encrypted
handles. Each cast commits to its access policy. A verifier submits a signed,
expiring encrypted eligibility value tied to the policy, FID, reader, and nonce.
Nox releases either the encrypted content key or encrypted zero without
publishing the access decision.
