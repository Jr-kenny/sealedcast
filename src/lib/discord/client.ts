const DISCORD_API = 'https://discord.com/api/v10';

export type DiscordTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

function discordConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Discord OAuth is not configured');
  }
  return { clientId, clientSecret, redirectUri };
}

export function discordAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = discordConfig();
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds guilds.members.read',
    state
  });
  return `https://discord.com/oauth2/authorize?${query.toString()}`;
}

export async function exchangeDiscordCode(
  code: string
): Promise<DiscordTokenResponse> {
  const { clientId, clientSecret, redirectUri } = discordConfig();
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });
  if (!response.ok) throw new Error('Discord rejected the authorization code');
  return response.json() as Promise<DiscordTokenResponse>;
}

export async function fetchDiscordUser(
  accessToken: string
): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Discord profile could not be loaded');
  return response.json() as Promise<DiscordUser>;
}

export async function revokeDiscordToken(token: string): Promise<void> {
  const { clientId, clientSecret } = discordConfig();
  const response = await fetch(`${DISCORD_API}/oauth2/token/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: 'access_token'
    })
  });
  if (!response.ok) throw new Error('Discord token could not be revoked');
}

export function discordAvatarUrl(user: DiscordUser): string | null {
  return user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : null;
}
