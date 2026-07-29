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
import type { SealedAccessPolicy } from '@lib/types/sealed-cast';
import { evaluateSealedPolicy } from '@lib/sealed-casts/evaluate-policy';
import { policyCommitment } from '@lib/sealed-casts/policy';

const ZERO = '0x0000000000000000000000000000000000000000';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
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
      policy?: SealedAccessPolicy;
      commitment?: Hex;
    };
    const lockedMessage = lockedMessageForPolicy(
      audiencePolicy.visibility,
      sealedCast.public_hint
    );
    const registryValue =
      process.env.SEALED_CAST_REGISTRY_ADDRESS ||
      process.env.NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS;
    const key = process.env.SEALED_CAST_RELAYER_PRIVATE_KEY as Hex | undefined;
    const verifierKey = (process.env.SEALED_CAST_ACCESS_VERIFIER_PRIVATE_KEY ||
      process.env.SEALED_CAST_WALLET_VERIFIER_PRIVATE_KEY ||
      key) as Hex | undefined;
    if (!registryValue || !isAddress(registryValue) || !key || !verifierKey) {
      res.status(503).json({ error: 'Sepolia relayer is not configured' });
      return;
    }
    const registry = getAddress(registryValue);
    const relayer = privateKeyToAccount(key);
    const verifier = privateKeyToAccount(verifierKey);
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
    if (
      !audiencePolicy.policy ||
      !audiencePolicy.commitment ||
      policyCommitment(audiencePolicy.policy) !== audiencePolicy.commitment
    ) {
      res.status(500).json({ error: 'Sealed cast policy is invalid' });
      return;
    }
    // Creators retain access to their own encrypted content regardless of the
    // audience rules they chose for everyone else.
    const eligible =
      fid === sealedCast.creator_fid ||
      (await evaluateSealedPolicy(fid, audiencePolicy.policy));
    const { createViemHandleClient } = await import('@iexec-nox/handle');
    const handleClient = await createViemHandleClient(walletClient);
    const encryptedEligibility = await handleClient.encryptInput(
      eligible ? 1n : 0n,
      'uint256',
      registry
    );
    const reader = getAddress(auth.reader);
    const nonce = await publicClient.readContract({
      address: registry,
      abi: sealedCastRegistryAbi,
      functionName: 'accessNonces',
      args: [castId, reader]
    });
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 300);
    const verifierSignature = await verifier.signTypedData({
      domain: {
        name: 'SealedCastRegistry',
        version: '1',
        chainId: sepolia.id,
        verifyingContract: registry
      },
      types: {
        AccessAttestation: [
          { name: 'castId', type: 'uint256' },
          { name: 'fid', type: 'uint256' },
          { name: 'reader', type: 'address' },
          { name: 'encryptedEligibilityHandle', type: 'bytes32' },
          { name: 'policyHash', type: 'bytes32' },
          { name: 'nonce', type: 'uint256' },
          { name: 'expiry', type: 'uint64' }
        ]
      },
      primaryType: 'AccessAttestation',
      message: {
        castId,
        fid,
        reader,
        encryptedEligibilityHandle: encryptedEligibility.handle as Hex,
        policyHash: audiencePolicy.commitment,
        nonce,
        expiry
      }
    });
    const hash = await walletClient.writeContract({
      address: registry,
      abi: sealedCastRegistryAbi,
      functionName: 'requestAccessKey',
      args: [
        castId,
        fid,
        reader,
        encryptedEligibility.handle as Hex,
        encryptedEligibility.handleProof as Hex,
        expiry,
        verifierSignature
      ]
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const contentKeyHandle = await publicClient.readContract({
      address: registry,
      abi: sealedCastRegistryAbi,
      functionName: 'getReaderKeyHandle',
      args: [castId, reader]
    });
    res.status(200).json({
      status: 'granted',
      lockedMessage,
      envelope: sealedCast.encrypted_content as SealedCastEnvelope,
      contentKeyHandle
    });
  } catch (reason) {
    console.error('Sealed cast access check failed', reason);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Private access check is temporarily unavailable'
      });
    }
  }
}
