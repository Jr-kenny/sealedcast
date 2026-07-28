import { getNeynarCastReplies } from '@lib/neynar';
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
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!/^(0x)?[0-9a-fA-F]{40}$/.test(id)) {
    res.status(400).json({ message: 'Invalid cast hash' });
    return;
  }

  try {
    const result = await getNeynarCastReplies({
      hash: id,
      viewerFid:
        typeof req.query.viewer_fid === 'string'
          ? req.query.viewer_fid
          : undefined,
      limit: Number(req.query.limit ?? 10),
      cursor:
        typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    });
    res.json({ result });
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load replies'
    });
  }
}
