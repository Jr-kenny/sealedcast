import { createHash, randomBytes } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeDiscordIdentityRequest } from '@lib/discord/authorization';
import { discordAuthorizationUrl } from '@lib/discord/client';

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
  if (!(await authorizeDiscordIdentityRequest(authorization, 'link'))) {
    res.status(401).json({ error: 'Invalid Farcaster authorization' });
    return;
  }

  try {
    const state = randomBytes(32).toString('base64url');
    const stateHash = createHash('sha256').update(state).digest('hex');
    const now = new Date();
    await prisma.$transaction([
      prisma.sealed_oauth_states.deleteMany({
        where: { expires_at: { lt: now } }
      }),
      prisma.sealed_oauth_states.create({
        data: {
          state_hash: stateHash,
          fid: BigInt(authorization!.fid),
          reader: authorization!.reader.toLowerCase(),
          expires_at: new Date(now.getTime() + 10 * 60_000)
        }
      })
    ]);
    res.status(200).json({ result: { url: discordAuthorizationUrl(state) } });
  } catch (reason) {
    console.error('Discord OAuth start failed', reason);
    res.status(503).json({ error: 'Discord connection could not be started' });
  }
}
