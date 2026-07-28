import { deleteNeynarCast, getApprovedNeynarSigner } from '@lib/neynar';
import type { NextApiRequest, NextApiResponse } from 'next';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAST_HASH = /^(0x)?[a-f0-9]{40}$/i;

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { fid, signerUuid, targetHash } = req.body as {
    fid?: string;
    signerUuid?: string;
    targetHash?: string;
  };
  if (
    !fid ||
    !/^\d+$/.test(fid) ||
    !signerUuid ||
    !UUID.test(signerUuid) ||
    !targetHash ||
    !CAST_HASH.test(targetHash)
  ) {
    res.status(400).json({ error: 'Invalid cast deletion request' });
    return;
  }
  try {
    const signer = await getApprovedNeynarSigner(signerUuid, fid);
    if (!signer) {
      res.status(401).json({ error: 'Neynar signer is not approved' });
      return;
    }
    await deleteNeynarCast({
      signerUuid,
      targetHash: targetHash.startsWith('0x') ? targetHash : `0x${targetHash}`
    });
    res.json({ result: { success: true } });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Unable to delete cast'
    });
  }
}
