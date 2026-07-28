import { getApprovedNeynarSigner, setNeynarFollow } from '@lib/neynar';
import type { BaseResponse } from '@lib/types/responses';
import type { NextApiRequest, NextApiResponse } from 'next';

type FollowBody = {
  fid?: string;
  signerUuid?: string;
  targetFid?: string;
  action?: 'follow' | 'unfollow';
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<BaseResponse<{ following: boolean }> & { error?: string }>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const { fid, signerUuid, targetFid, action } = req.body as FollowBody;
  if (
    !fid ||
    !signerUuid ||
    !targetFid ||
    !/^\d+$/.test(fid) ||
    !/^\d+$/.test(targetFid) ||
    (action !== 'follow' && action !== 'unfollow')
  ) {
    res.status(400).json({ error: 'Invalid follow request' });
    return;
  }
  if (fid === targetFid) {
    res.status(400).json({ error: 'You cannot follow your own account' });
    return;
  }

  const signer = await getApprovedNeynarSigner(signerUuid, fid);
  if (!signer) {
    res.status(401).json({ error: 'Your Farcaster signer is no longer approved' });
    return;
  }

  try {
    await setNeynarFollow({
      signerUuid,
      targetFid: Number(targetFid),
      remove: action === 'unfollow'
    });
    res.json({ result: { following: action === 'follow' } });
  } catch (error) {
    res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : 'Unable to update this follow'
    });
  }
}
