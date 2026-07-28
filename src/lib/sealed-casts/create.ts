import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  parseEventLogs,
  type Hex
} from 'viem';
import { sepolia } from 'viem/chains';
import { sealedCastRegistryAbi } from '@contracts/sealed-cast-registry';
import type {
  SealedAccessPolicy,
  SealedPolicyVisibility
} from '@lib/types/sealed-cast';
import {
  createSealedAccessAuthorization,
  type AuthorizationIdentity
} from './access-authorization';
import { encryptSealedCast, sealedContentKeyToUint256 } from './crypto';
import { createSealedReaderWalletClient } from './reader-identity';
import { policyCommitment } from './policy';

export async function createWalletSealedCast({
  fid,
  plaintext,
  publicHint,
  policyVisibility,
  policy,
  ...identity
}: {
  fid: string;
  plaintext: string;
  publicHint: string;
  policyVisibility: SealedPolicyVisibility;
  policy: SealedAccessPolicy;
} & AuthorizationIdentity): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS;
  if (!configured || !isAddress(configured)) {
    throw new Error('Sealed Casts is not configured');
  }
  const registry = getAddress(configured);
  const onchainPublicHint = policyVisibility === 'public' ? publicHint : '';
  const walletClient = createSealedReaderWalletClient(fid);
  const reader = walletClient.account.address;
  const sponsorAuthorization = await createSealedAccessAuthorization({
    fid,
    castId: '0',
    reader,
    ...identity
  });
  const sponsorResponse = await fetch('/api/sealed-casts/sponsor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sponsorAuthorization)
  });
  if (!sponsorResponse.ok) {
    const body = (await sponsorResponse.json()) as { error?: string };
    throw new Error(body.error || 'Could not sponsor Sepolia gas');
  }

  const { createViemHandleClient } = await import('@iexec-nox/handle');
  const handleClient = await createViemHandleClient(walletClient);
  const { envelope, contentKey } = await encryptSealedCast(plaintext);
  const encryptedKey = await handleClient.encryptInput(
    sealedContentKeyToUint256(contentKey),
    'uint256',
    registry
  );
  const policyHash = policyCommitment(policy);

  const txHash = await walletClient.writeContract({
    address: registry,
    abi: sealedCastRegistryAbi,
    functionName: 'createSealedCast',
    args: [
      `0x${'0'.repeat(64)}` as Hex,
      'sealedcast://database',
      onchainPublicHint,
      policyVisibility === 'public',
      policyHash,
      encryptedKey.handle as Hex,
      encryptedKey.handleProof as Hex
    ]
  });
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash
  });
  const [event] = parseEventLogs({
    abi: sealedCastRegistryAbi,
    eventName: 'SealedCastCreated',
    logs: receipt.logs
  });
  if (!event) throw new Error('No sealed cast ID was emitted');
  const castId = event.args.castId.toString();
  const authorization = await createSealedAccessAuthorization({
    fid,
    castId,
    reader,
    ...identity
  });
  const response = await fetch('/api/sealed-casts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authorization,
      envelope,
      publicHint: onchainPublicHint,
      policyVisibility,
      policy,
      policyHash
    })
  });
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error || 'Could not save encrypted cast');
  }
  return castId;
}
