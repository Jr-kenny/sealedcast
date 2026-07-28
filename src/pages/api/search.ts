import { searchNeynarUsers } from '@lib/neynar';
import type { BaseResponse } from '@lib/types/responses';
import type { User } from '@lib/types/user';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<BaseResponse<User[]>>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    res.json({ result: [] });
    return;
  }

  try {
    const users = await searchNeynarUsers(
      query,
      typeof req.query.viewer_fid === 'string'
        ? req.query.viewer_fid
        : undefined,
      5
    );
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.json({ result: users });
  } catch (error) {
    res.status(502).json({
      message:
        error instanceof Error ? error.message : 'Unable to search Farcaster'
    });
  }
}
