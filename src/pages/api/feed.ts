import { getNeynarFeed } from '@lib/neynar';
import type { PaginatedTweetsResponse } from '@lib/paginated-tweets';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedTweetsResponse | { message: string }>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    return;
  }

  const fid = typeof req.query.fid === 'string' ? req.query.fid : '';
  if (!/^\d+$/.test(fid)) {
    res.status(400).json({ message: 'A valid Farcaster FID is required' });
    return;
  }

  if (req.query.after === 'true') {
    res.json({ result: { tweets: [], users: {}, nextPageCursor: null } });
    return;
  }

  const requestedLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 10;
  const cursor =
    typeof req.query.skip === 'string' && req.query.skip !== '0'
      ? req.query.skip
      : undefined;
  const topicUrl =
    typeof req.query.topic_url === 'string'
      ? decodeURIComponent(req.query.topic_url)
      : undefined;
  const ordering = req.query.ordering === 'top' ? 'top' : 'latest';

  try {
    const result = await getNeynarFeed({
      fid,
      limit,
      cursor,
      topicUrl,
      ordering
    });
    res.setHeader('Cache-Control', 'private, max-age=10');
    res.json({ result });
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load feed'
    });
  }
}
