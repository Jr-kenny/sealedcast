import { getNeynarUserCasts } from '@lib/neynar';
import type { PaginatedTweetsResponse } from '@lib/paginated-tweets';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedTweetsResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const fid = typeof req.query.id === 'string' ? req.query.id : '';
  if (!/^\d+$/.test(fid)) {
    res.status(400).json({ message: 'A valid Farcaster FID is required' });
    return;
  }

  try {
    const result = await getNeynarUserCasts({
      fid,
      viewerFid:
        typeof req.query.viewer_fid === 'string'
          ? req.query.viewer_fid
          : undefined,
      limit: Number(req.query.limit ?? 10),
      cursor:
        typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
      includeReplies: req.query.replies === 'true'
    });
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.json({ result });
  } catch (error) {
    res.status(502).json({
      message:
        error instanceof Error ? error.message : 'Unable to load user casts'
    });
  }
}
