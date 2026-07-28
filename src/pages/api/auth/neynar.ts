import type { NextApiRequest, NextApiResponse } from 'next';
import { getApprovedNeynarSigner, getNeynarUser } from '@lib/neynar';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { fid, signerUuid } = req.body as {
    fid?: string;
    signerUuid?: string;
  };
  if (!fid || !/^\d+$/.test(fid) || !signerUuid || !UUID.test(signerUuid)) {
    res.status(400).json({ error: 'Invalid Neynar authorization' });
    return;
  }
  try {
    const signer = await getApprovedNeynarSigner(signerUuid, fid);
    if (!signer) {
      res.status(401).json({ error: 'Neynar signer is not approved' });
      return;
    }
    const user = await getNeynarUser(fid);
    if (!user) {
      res.status(404).json({ error: 'Farcaster user was not found' });
      return;
    }
    res.status(200).json({ result: { user } });
  } catch (reason) {
    res.status(503).json({
      error: reason instanceof Error ? reason.message : 'Neynar is unavailable'
    });
  }
}
