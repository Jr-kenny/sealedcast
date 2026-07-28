import { NextApiRequest, NextApiResponse } from 'next';
import type { PaginatedUsersResponse } from '../../../../lib/paginated-reactions';
import { getNeynarCastReactionUsers } from '../../../../lib/neynar';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedUsersResponse>
) {
  const { method } = req;
  switch (method) {
    case 'GET':
      const id = req.query.id;
      const cursor = req.query.cursor as string | undefined;
      const limit =
        req.query.limit && req.query.limit !== 'undefined'
          ? Number(req.query.limit)
          : 10;
      const type =
        parseInt(req.query.type as string) === 1 ? 'likes' : 'recasts';
      const { users, nextPageCursor } = await getNeynarCastReactionUsers({
        hash: id as string,
        type,
        limit,
        cursor,
        viewerFid: req.query.viewer_fid as string | undefined
      });

      res.json({
        result: { users, nextPageCursor }
      });
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
