import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseEther,
  type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { prisma } from '@lib/prisma';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeSealedCastRequest } from '@lib/sealed-casts/server-authorization';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const auth = req.body as SealedAccessAuthorization;
  if (
    auth.castId !== '0' ||
    !isAddress(auth.reader) ||
    Math.abs(Date.now() - auth.timestamp) > 300_000 ||
    !(await authorizeSealedCastRequest(auth))
  ) {
    res.status(401).json({ error: 'Invalid sponsorship authorization' });
    return;
  }
  const fid = BigInt(auth.fid);
  const reader = auth.reader.toLowerCase();
  const existing = await prisma.sealed_gas_sponsorships.findUnique({
    where: { fid_reader: { fid, reader } }
  });
  if (existing) {
    res.status(200).json({ result: { txHash: existing.tx_hash } });
    return;
  }
  const sponsoredReaders = await prisma.sealed_gas_sponsorships.count({
    where: { fid }
  });
  if (sponsoredReaders >= 3) {
    res.status(429).json({
      error: 'This Farcaster account has reached its sponsored device limit'
    });
    return;
  }
  const key = process.env.SEALED_CAST_RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!key) {
    res.status(503).json({ error: 'Gas relayer is not configured' });
    return;
  }
  const account = privateKeyToAccount(key);
  const transport = http(process.env.SEPOLIA_RPC_URL);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport
  });
  const txHash = await walletClient.sendTransaction({
    account,
    to: auth.reader,
    value: parseEther('0.0005')
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  await prisma.sealed_gas_sponsorships.create({
    data: { fid, reader, tx_hash: txHash }
  });
  res.status(201).json({ result: { txHash } });
}
