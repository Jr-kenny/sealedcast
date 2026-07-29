import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createPublicClient,
  createWalletClient,
  getAddress,
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

const MINIMUM_READER_BALANCE = parseEther('0.0005');
const TARGET_READER_BALANCE = parseEther('0.0015');
const TOP_UP_COOLDOWN_MS = 60 * 60 * 1000;

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
  const readerAddress = getAddress(auth.reader);
  const readerBalance = await publicClient.getBalance({
    address: readerAddress
  });

  if (readerBalance >= MINIMUM_READER_BALANCE) {
    res.status(200).json({
      result: {
        txHash: existing?.tx_hash ?? null,
        balance: readerBalance.toString(),
        sponsored: Boolean(existing)
      }
    });
    return;
  }

  if (
    existing &&
    Date.now() - existing.created_at.getTime() < TOP_UP_COOLDOWN_MS
  ) {
    res.status(429).json({
      error: 'Sepolia gas was sponsored recently. Please try again shortly.'
    });
    return;
  }

  if (!existing) {
    const sponsoredReaders = await prisma.sealed_gas_sponsorships.count({
      where: { fid }
    });
    if (sponsoredReaders >= 3) {
      res.status(429).json({
        error: 'This Farcaster account has reached its sponsored device limit'
      });
      return;
    }
  }

  const value = TARGET_READER_BALANCE - readerBalance;
  const relayerBalance = await publicClient.getBalance({
    address: account.address
  });
  if (relayerBalance < value) {
    res.status(503).json({ error: 'Sepolia gas sponsor needs funding' });
    return;
  }

  const txHash = await walletClient.sendTransaction({
    account,
    to: readerAddress,
    value
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (existing) {
    await prisma.sealed_gas_sponsorships.update({
      where: { fid_reader: { fid, reader } },
      data: { tx_hash: txHash, created_at: new Date() }
    });
  } else {
    await prisma.sealed_gas_sponsorships.create({
      data: { fid, reader, tx_hash: txHash }
    });
  }
  res.status(existing ? 200 : 201).json({
    result: {
      txHash,
      balance: TARGET_READER_BALANCE.toString(),
      toppedUp: Boolean(existing)
    }
  });
}
