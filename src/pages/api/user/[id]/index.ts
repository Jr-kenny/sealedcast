import type { NextApiRequest, NextApiResponse } from 'next';
import { UserFull, UserResponse } from '../../../../lib/types/user';
import { resolveUserAmbiguous } from '../../../../lib/user/resolve-user';
import { getNeynarUser } from '@lib/neynar';

type UserEndpointQuery = {
  id: string;
  full?: string;
  viewer_fid?: string;
};

export default async function userIdEndpoint(
  req: NextApiRequest,
  res: NextApiResponse<UserResponse>
): Promise<void> {
  const { id, full = 'true', viewer_fid: viewerFid } =
    req.query as UserEndpointQuery;

  const user =
    (await getNeynarUser(id, viewerFid).catch(() => null)) ||
    ((await resolveUserAmbiguous(id, full === 'true')) as UserFull);

  if (!user) {
    res.status(404).json({
      message: 'User not found'
    });
    return;
  }

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );
  res.json({ result: user });
}
