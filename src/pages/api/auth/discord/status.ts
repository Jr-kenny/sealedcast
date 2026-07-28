import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeDiscordIdentityRequest } from '@lib/discord/authorization';

type Body = { authorization?: SealedAccessAuthorization };

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { authorization } = (req.body || {}) as Body;
  if (!(await authorizeDiscordIdentityRequest(authorization, 'status'))) {
    res.status(401).json({ error: 'Invalid Farcaster authorization' });
    return;
  }
  const link = await prisma.sealed_discord_links.findUnique({
    where: { fid: BigInt(authorization!.fid) },
    select: {
      discord_user_id: true,
      username: true,
      global_name: true,
      avatar: true,
      created_at: true
    }
  });
  res.status(200).json({ result: { connected: Boolean(link), account: link } });
}
