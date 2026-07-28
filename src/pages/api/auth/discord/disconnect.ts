import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeDiscordIdentityRequest } from '@lib/discord/authorization';
import { revokeDiscordToken } from '@lib/discord/client';
import { decryptDiscordToken } from '@lib/discord/token-crypto';

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
  if (!(await authorizeDiscordIdentityRequest(authorization, 'disconnect'))) {
    res.status(401).json({ error: 'Invalid Farcaster authorization' });
    return;
  }
  const fid = BigInt(authorization!.fid);
  const link = await prisma.sealed_discord_links.findUnique({ where: { fid } });
  if (link) {
    try {
      await revokeDiscordToken(
        decryptDiscordToken(link.encrypted_access_token)
      );
    } catch (reason) {
      console.warn('Discord token revocation failed', reason);
    }
    await prisma.sealed_discord_links.delete({ where: { fid } });
  }
  res.status(200).json({ result: { connected: false } });
}
