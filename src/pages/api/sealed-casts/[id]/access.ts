import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { sealedCastRegistryAbi } from '@contracts/sealed-cast-registry';
import { prisma } from '@lib/prisma';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeSealedCastRequest } from '@lib/sealed-casts/server-authorization';
import type { SealedCastEnvelope } from '@lib/types/sealed-cast';
import { lockedMessageForPolicy } from '@lib/sealed-casts/visibility';

const ZERO = '0x0000000000000000000000000000000000000000';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const auth = req.body as SealedAccessAuthorization;
  const id = req.query.id;
  if (
    typeof id !== 'string' ||
    auth.castId !== id ||
    !isAddress(auth.reader) ||
    Math.abs(Date.now() - auth.timestamp) > 300_000 ||
    !(await authorizeSealedCastRequest(auth))
  ) {
    res.status(401).json({ error: 'Invalid access authorization' });
    return;
  }
  const fid = BigInt(auth.fid);
  const sealedCast = await prisma.sealed_casts.findUnique({
    where: { contract_cast_id: BigInt(id) }
  });
  if (!sealedCast) {
    res.status(404).json({ error: 'Sealed cast not found' });
    return;
  }
  const audiencePolicy = sealedCast.audience_policy as {
    visibility?: 'public' | 'hidden';
  };
  const lockedMessage = lockedMessageForPolicy(
    audiencePolicy.visibility,
    sealedCast.public_hint
  );
  const registryValue =
    process.env.SEALED_CAST_REGISTRY_ADDRESS ||
    process.env.NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS;
  const key = process.env.SEALED_CAST_RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!registryValue || !isAddress(registryValue) || !key) {
    res.status(503).json({ error: 'Sepolia relayer is not configured' });
    return;
  }
  const registry = getAddress(registryValue);
  const relayer = privateKeyToAccount(key);
  const transport = http(process.env.SEPOLIA_RPC_URL);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({
    account: relayer,
    chain: sepolia,
    transport
  });
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
  const castId = BigInt(id);
  let contentKeyHandle = await publicClient.readContract({
    address: registry,
    abi: sealedCastRegistryAbi,
    functionName: 'getReaderKeyHandle',
    args: [castId, getAddress(auth.reader)]
  });
  if (contentKeyHandle === `0x${'0'.repeat(64)}`) {
    const hash = await walletClient.writeContract({
      address: registry,
      abi: sealedCastRegistryAbi,
      functionName: 'requestAccessKey',
      args: [castId, fid, getAddress(auth.reader)]
    });
    await publicClient.waitForTransactionReceipt({ hash });
    contentKeyHandle = await publicClient.readContract({
      address: registry,
      abi: sealedCastRegistryAbi,
      functionName: 'getReaderKeyHandle',
      args: [castId, getAddress(auth.reader)]
    });
  }
  res.status(200).json({
    status: 'granted',
    lockedMessage,
    envelope: sealedCast.encrypted_content as SealedCastEnvelope,
    contentKeyHandle
  });
}
