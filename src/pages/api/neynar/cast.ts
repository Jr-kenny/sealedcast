import type { NextApiRequest, NextApiResponse } from 'next';
import { getApprovedNeynarSigner, publishNeynarCast } from '@lib/neynar';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  fid?: string;
  signerUuid?: string;
  text?: string;
  embeds?: Array<{ url: string }>;
  parent?: string;
  parentAuthorFid?: number;
  idem?: string;
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = req.body as Body;
  const embeds = body.embeds ?? [];
  if (
    !body.fid ||
    !/^\d+$/.test(body.fid) ||
    !body.signerUuid ||
    !UUID.test(body.signerUuid) ||
    typeof body.text !== 'string' ||
    body.text.length === 0 ||
    Buffer.byteLength(body.text, 'utf8') > 1024 ||
    embeds.length > 2 ||
    embeds.some(({ url }) => {
      try {
        return new URL(url).protocol !== 'https:';
      } catch {
        return true;
      }
    }) ||
    !body.idem ||
    !UUID.test(body.idem)
  ) {
    res.status(400).json({ error: 'Invalid cast request' });
    return;
  }
  try {
    const signer = await getApprovedNeynarSigner(body.signerUuid, body.fid);
    if (!signer) {
      res.status(401).json({ error: 'Neynar signer is not approved' });
      return;
    }
    const cast = await publishNeynarCast({
      signerUuid: body.signerUuid,
      text: body.text,
      embeds,
      parent: body.parent,
      parentAuthorFid: body.parentAuthorFid,
      idem: body.idem
    });
    res.status(201).json({ result: { cast } });
  } catch (reason) {
    res.status(502).json({
      error: reason instanceof Error ? reason.message : 'Cast publish failed'
    });
  }
}
