import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import { lockedMessageForPolicy } from '@lib/sealed-casts/visibility';

export type SealedCastPublicMetadata = {
  id: string;
  creatorFid: string;
  lockedMessage: string;
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const id = req.query.id;
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid sealed cast ID' });
    return;
  }

  const sealedCast = await prisma.sealed_casts.findUnique({
    where: { contract_cast_id: BigInt(id) },
    select: {
      creator_fid: true,
      public_hint: true,
      audience_policy: true
    }
  });
  if (!sealedCast) {
    res.status(404).json({ error: 'Sealed cast not found' });
    return;
  }

  const policy = sealedCast.audience_policy as {
    visibility?: 'public' | 'hidden';
  };
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );
  res.status(200).json({
    id,
    creatorFid: sealedCast.creator_fid.toString(),
    lockedMessage: lockedMessageForPolicy(
      policy.visibility,
      sealedCast.public_hint
    )
  } satisfies SealedCastPublicMetadata);
}
