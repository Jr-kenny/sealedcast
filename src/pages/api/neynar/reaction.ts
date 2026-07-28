import { getApprovedNeynarSigner, setNeynarReaction } from '@lib/neynar';
import type { NextApiRequest, NextApiResponse } from 'next';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAST_HASH = /^(0x)?[a-f0-9]{40}$/i;

type Body = {
  fid?: string;
  signerUuid?: string;
  target?: string;
  targetAuthorFid?: string;
  reactionType?: 'like' | 'recast';
  action?: 'add' | 'remove';
  idem?: string;
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = req.body as Body;
  if (
    !body.fid ||
    !/^\d+$/.test(body.fid) ||
    !body.signerUuid ||
    !UUID.test(body.signerUuid) ||
    !body.target ||
    !CAST_HASH.test(body.target) ||
    !body.targetAuthorFid ||
    !/^\d+$/.test(body.targetAuthorFid) ||
    (body.reactionType !== 'like' && body.reactionType !== 'recast') ||
    (body.action !== 'add' && body.action !== 'remove') ||
    !body.idem ||
    !UUID.test(body.idem)
  ) {
    res.status(400).json({ error: 'Invalid reaction request' });
    return;
  }
  try {
    const signer = await getApprovedNeynarSigner(body.signerUuid, body.fid);
    if (!signer) {
      res.status(401).json({ error: 'Neynar signer is not approved' });
      return;
    }
    await setNeynarReaction({
      signerUuid: body.signerUuid,
      target: body.target.startsWith('0x') ? body.target : `0x${body.target}`,
      targetAuthorFid: Number(body.targetAuthorFid),
      reactionType: body.reactionType,
      remove: body.action === 'remove',
      idem: body.idem
    });
    res.json({ result: { active: body.action === 'add' } });
  } catch (error) {
    res.status(502).json({
      error:
        error instanceof Error ? error.message : 'Unable to update reaction'
    });
  }
}
