import hre from 'hardhat';

const { viem } = await hre.network.connect();
const [deployer] = await viem.getWalletClients();
const verifier =
  process.env.WALLET_VERIFIER_ADDRESS ?? deployer.account.address;
const firstCastId = BigInt(process.env.FIRST_CAST_ID ?? '1');
const registry = await viem.deployContract('SealedCastRegistry', [
  verifier,
  firstCastId
]);

console.log(`SealedCastRegistry=${registry.address}`);
console.log(`WalletVerifier=${verifier}`);
console.log(`FirstCastId=${firstCastId}`);
console.log('Network=Ethereum Sepolia (11155111)');
