import { createHash } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import {
  discordAvatarUrl,
  exchangeDiscordCode,
  fetchDiscordUser
} from '@lib/discord/client';
import { encryptDiscordToken } from '@lib/discord/token-crypto';

function appRedirect(result: 'connected' | 'denied' | 'failed'): string {
  const base = process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Application URL is not configured');
  return `${base}/settings/qualification-wallets?discord=${result}`;
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  const denied = typeof req.query.error === 'string';
  if (!state || (!code && !denied)) {
    res.redirect(303, appRedirect('failed'));
    return;
  }

  const stateHash = createHash('sha256').update(state).digest('hex');
  const storedState = await prisma.sealed_oauth_states.findUnique({
    where: { state_hash: stateHash }
  });
  if (!storedState || storedState.expires_at <= new Date()) {
    if (storedState) {
      await prisma.sealed_oauth_states.delete({
        where: { state_hash: stateHash }
      });
    }
    res.redirect(303, appRedirect('failed'));
    return;
  }
  const consumed = await prisma.sealed_oauth_states.deleteMany({
    where: { state_hash: stateHash, expires_at: { gt: new Date() } }
  });
  if (consumed.count !== 1) {
    res.redirect(303, appRedirect('failed'));
    return;
  }
  if (denied || !code) {
    res.redirect(303, appRedirect('denied'));
    return;
  }

  try {
    const token = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(token.access_token);
    await prisma.sealed_discord_links.upsert({
      where: { fid: storedState.fid },
      create: {
        fid: storedState.fid,
        discord_user_id: discordUser.id,
        username: discordUser.username,
        global_name: discordUser.global_name,
        avatar: discordAvatarUrl(discordUser),
        encrypted_access_token: encryptDiscordToken(token.access_token),
        encrypted_refresh_token: encryptDiscordToken(token.refresh_token),
        token_expires_at: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope
      },
      update: {
        discord_user_id: discordUser.id,
        username: discordUser.username,
        global_name: discordUser.global_name,
        avatar: discordAvatarUrl(discordUser),
        encrypted_access_token: encryptDiscordToken(token.access_token),
        encrypted_refresh_token: encryptDiscordToken(token.refresh_token),
        token_expires_at: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
        updated_at: new Date()
      }
    });
    res.redirect(303, appRedirect('connected'));
  } catch (reason) {
    console.error('Discord OAuth callback failed', reason);
    res.redirect(303, appRedirect('failed'));
  }
}
