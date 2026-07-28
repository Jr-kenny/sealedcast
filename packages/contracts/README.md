# Sealed Cast Registry

iExec Nox-powered confidential audience gating for OpenCast.

## Ethereum Sepolia

```bash
export SEPOLIA_RPC_URL="https://..."
export DEPLOYER_PRIVATE_KEY="0x..."
export WALLET_VERIFIER_ADDRESS="0x..."
npm run deploy:sepolia
```

The contract stores qualification wallets, audience wallets, and content keys as
Nox encrypted handles. It only releases a decryptable key handle when one of a
reader's five privately bound wallets matches a cast's encrypted audience.
