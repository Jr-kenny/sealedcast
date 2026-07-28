import { getNeynarTrendingTopics } from '@lib/neynar';
import type { TrendsResponse } from '@lib/types/trends';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<TrendsResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const requestedLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 20)
    : 10;

  try {
    const topics = await getNeynarTrendingTopics(limit);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.json({ result: topics });
  } catch (error) {
    res.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : 'Unable to load trending topics'
    });
  }
}
