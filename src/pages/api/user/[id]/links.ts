import { getNeynarFollowUsers } from '@lib/neynar';
import type { PaginatedUsersResponse } from '@lib/paginated-reactions';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedUsersResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const fid = typeof req.query.id === 'string' ? req.query.id : '';
  const type = req.query.type;
  if (!/^\d+$/.test(fid) || (type !== 'following' && type !== 'followers')) {
    res.status(400).json({ message: 'Invalid follow list request' });
    return;
  }

  try {
    const result = await getNeynarFollowUsers({
      fid,
      viewerFid:
        typeof req.query.viewer_fid === 'string'
          ? req.query.viewer_fid
          : undefined,
      type,
      limit: Number(req.query.limit ?? 10),
      cursor:
        typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    });
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json({ result });
  } catch (error) {
    res.status(502).json({
      message:
        error instanceof Error ? error.message : 'Unable to load follow list'
    });
  }
}
