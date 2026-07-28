import type { NextApiRequest, NextApiResponse } from 'next';
import {
  BaseError,
  createPublicClient,
  createWalletClient,
  getAddress,
  hexToBigInt,
  http,
  isAddress,
  isHex,
  verifyMessage,
  type Address,
  type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { sealedCastRegistryAbi } from '@contracts/sealed-cast-registry';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeSealedCastRequest } from '@lib/sealed-casts/server-authorization';
import { walletOwnershipMessage } from '@lib/sealed-casts/wallet-binding';

type Action = 'list' | 'bind' | 'unbind';
type Body = {
  action: Action;
  slot?: number;
  wallet?: Address;
  ownershipSignature?: Hex;
  ownershipExpiry?: number;
  authorization: SealedAccessAuthorization;
};
const ZERO = '0x0000000000000000000000000000000000000000';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = req.body as Body | undefined;
  if (!body) {
    res.status(400).json({ error: 'Request body required' });
    return;
  }
  const auth = body.authorization;
  let authorized = false;
  if (
    auth &&
    ['list', 'bind', 'unbind'].includes(body.action) &&
    auth.castId === `wallet-${body.action}` &&
    /^\d+$/.test(auth.fid) &&
    BigInt(auth.fid) > 0n &&
    Number.isFinite(auth.timestamp) &&
    Math.abs(Date.now() - auth.timestamp) <= 300_000
  ) {
    try {
      authorized = await authorizeSealedCastRequest(auth);
    } catch {
      authorized = false;
    }
  }
  if (!authorized) {
    res.status(401).json({ error: 'Invalid Farcaster authorization' });
    return;
  }
  const fid = BigInt(auth.fid);
  if (body.action !== 'list') {
    if (!Number.isInteger(body.slot) || body.slot! < 0 || body.slot! > 4) {
      res.status(400).json({ error: 'Wallet slot must be between 1 and 5' });
      return;
    }
  }

  let verifiedWallet: Address | undefined;
  if (body.action === 'bind') {
    if (
      !body.wallet ||
      !isAddress(body.wallet) ||
      !body.ownershipSignature ||
      !isHex(body.ownershipSignature) ||
      !body.ownershipExpiry ||
      !Number.isInteger(body.ownershipExpiry) ||
      body.ownershipExpiry < Date.now() / 1000 ||
      body.ownershipExpiry > Date.now() / 1000 + 900
    ) {
      res.status(400).json({ error: 'Current ownership proof required' });
      return;
    }
    verifiedWallet = getAddress(body.wallet);
    let ownsWallet = false;
    try {
      ownsWallet = await verifyMessage({
        address: verifiedWallet,
        message: walletOwnershipMessage({
          fid: auth.fid,
          slot: body.slot!,
          wallet: verifiedWallet,
          expiry: body.ownershipExpiry
        }),
        signature: body.ownershipSignature
      });
    } catch {
      ownsWallet = false;
    }
    if (!ownsWallet) {
      res.status(401).json({ error: 'Invalid wallet ownership signature' });
      return;
    }
  }

  const registryValue =
    process.env.SEALED_CAST_REGISTRY_ADDRESS ||
    process.env.NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!registryValue || !isAddress(registryValue) || !rpcUrl) {
    res
      .status(503)
      .json({ error: 'Sepolia wallet registry is not configured' });
    return;
  }
  const registry = getAddress(registryValue);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: sepolia, transport });

  if (body.action === 'list') {
    try {
      const [active, controller] = await Promise.all([
        publicClient.readContract({
          address: registry,
          abi: sealedCastRegistryAbi,
          functionName: 'qualificationWalletSlots',
          args: [fid]
        }),
        publicClient.readContract({
          address: registry,
          abi: sealedCastRegistryAbi,
          functionName: 'farcasterControllers',
          args: [fid]
        })
      ]);
      res.status(200).json({
        result: {
          active: [...active],
          controllerRegistered: getAddress(controller) !== ZERO
        }
      });
    } catch {
      res.status(502).json({ error: 'Could not read the Sepolia registry' });
    }
    return;
  }

  const relayerKey = process.env.SEALED_CAST_RELAYER_PRIVATE_KEY as
    | Hex
    | undefined;
  const verifierKey = (process.env.SEALED_CAST_WALLET_VERIFIER_PRIVATE_KEY ||
    relayerKey) as Hex | undefined;
  if (!relayerKey || !verifierKey) {
    res.status(503).json({ error: 'Sepolia wallet relayer is not configured' });
    return;
  }
  const relayer = privateKeyToAccount(relayerKey);
  const verifier = privateKeyToAccount(verifierKey);
  const walletClient = createWalletClient({
    account: relayer,
    chain: sepolia,
    transport
  });

  try {
    const controller = await publicClient.readContract({
      address: registry,
      abi: sealedCastRegistryAbi,
      functionName: 'farcasterControllers',
      args: [fid]
    });
    if (getAddress(controller) === ZERO) {
      const hash = await walletClient.writeContract({
        address: registry,
        abi: sealedCastRegistryAbi,
        functionName: 'registerFarcasterController',
        args: [fid]
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } else if (getAddress(controller) !== relayer.address) {
      res.status(409).json({ error: 'FID is controlled by another relayer' });
      return;
    }

    let txHash: Hex;
    if (body.action === 'bind') {
      const { createViemHandleClient } = await import('@iexec-nox/handle');
      const handleClient = await createViemHandleClient(walletClient);
      const encrypted = await handleClient.encryptInput(
        hexToBigInt(verifiedWallet!),
        'uint256',
        registry
      );
      const nonce = await publicClient.readContract({
        address: registry,
        abi: sealedCastRegistryAbi,
        functionName: 'bindingNonces',
        args: [fid]
      });
      const expiry = BigInt(body.ownershipExpiry!);
      const signature = await verifier.signTypedData({
        domain: {
          name: 'SealedCastRegistry',
          version: '1',
          chainId: sepolia.id,
          verifyingContract: registry
        },
        types: {
          WalletBinding: [
            { name: 'fid', type: 'uint256' },
            { name: 'slot', type: 'uint8' },
            { name: 'encryptedWalletHandle', type: 'bytes32' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint64' }
          ]
        },
        primaryType: 'WalletBinding',
        message: {
          fid,
          slot: body.slot!,
          encryptedWalletHandle: encrypted.handle as Hex,
          nonce,
          expiry
        }
      });
      txHash = await walletClient.writeContract({
        address: registry,
        abi: sealedCastRegistryAbi,
        functionName: 'bindQualificationWallet',
        args: [
          fid,
          body.slot!,
          encrypted.handle as Hex,
          encrypted.handleProof as Hex,
          expiry,
          signature
        ]
      });
    } else {
      txHash = await walletClient.writeContract({
        address: registry,
        abi: sealedCastRegistryAbi,
        functionName: 'unbindQualificationWallet',
        args: [fid, body.slot!]
      });
    }
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    const active = await publicClient.readContract({
      address: registry,
      abi: sealedCastRegistryAbi,
      functionName: 'qualificationWalletSlots',
      args: [fid]
    });
    res.status(200).json({ result: { active: [...active], txHash } });
  } catch (error) {
    res.status(502).json({
      error:
        error instanceof BaseError
          ? error.shortMessage
          : error instanceof Error
          ? error.message
          : 'Sepolia wallet operation failed'
    });
  }
}
