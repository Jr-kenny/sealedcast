import type { NextApiRequest, NextApiResponse } from 'next';
import { getNeynarNotifications } from '@lib/neynar';
import type { NeynarNotificationsResponse } from '@lib/types/neynar';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<NeynarNotificationsResponse | { error: string }>
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const fid = req.query.fid;
  const cursor = req.query.cursor;
  if (
    typeof fid !== 'string' ||
    !/^\d+$/.test(fid) ||
    (cursor !== undefined && typeof cursor !== 'string')
  ) {
    res.status(400).json({ error: 'Invalid notification request' });
    return;
  }
  try {
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.status(200).json(await getNeynarNotifications(fid, cursor));
  } catch (reason) {
    res.status(502).json({
      error:
        reason instanceof Error ? reason.message : 'Notifications unavailable'
    });
  }
}
