import hre from "hardhat";

const { viem } = await hre.network.connect();
const [deployer] = await viem.getWalletClients();
const verifier = process.env.WALLET_VERIFIER_ADDRESS ?? deployer.account.address;
const registry = await viem.deployContract("SealedCastRegistry", [verifier]);

console.log(`SealedCastRegistry=${registry.address}`);
console.log(`WalletVerifier=${verifier}`);
console.log("Network=Ethereum Sepolia (11155111)");
