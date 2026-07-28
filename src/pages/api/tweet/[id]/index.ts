import { getNeynarCast } from '@lib/neynar';
import type { TweetResponse, TweetWithUsers } from '@lib/types/tweet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<TweetResponse>
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
    const result = await getNeynarCast(
      id,
      typeof req.query.viewer_fid === 'string'
        ? req.query.viewer_fid
        : undefined
    );
    if (!result) {
      res.status(404).json({ message: 'Cast not found' });
      return;
    }
    res.json({
      result: { ...result.tweet, users: result.users } as TweetWithUsers
    });
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load cast'
    });
  }
}
