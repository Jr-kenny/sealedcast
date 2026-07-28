import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeSealedCastRequest } from '@lib/sealed-casts/server-authorization';

export async function authorizeDiscordIdentityRequest(
  authorization: SealedAccessAuthorization | undefined,
  action: 'link' | 'status' | 'disconnect'
): Promise<boolean> {
  if (
    !authorization ||
    authorization.castId !== `discord-${action}` ||
    !/^\d+$/.test(authorization.fid) ||
    BigInt(authorization.fid) <= 0n ||
    !Number.isFinite(authorization.timestamp) ||
    Math.abs(Date.now() - authorization.timestamp) > 300_000
  ) {
    return false;
  }
  try {
    return await authorizeSealedCastRequest(authorization);
  } catch {
    return false;
  }
}
