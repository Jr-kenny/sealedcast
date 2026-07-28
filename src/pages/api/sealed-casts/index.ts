import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeSealedCastRequest } from '@lib/sealed-casts/server-authorization';
import type {
  SealedCastEnvelope,
  SealedPolicyVisibility
} from '@lib/types/sealed-cast';

type Body = {
  authorization: SealedAccessAuthorization;
  envelope: SealedCastEnvelope;
  publicHint: string;
  policyVisibility: SealedPolicyVisibility;
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
  const auth = body.authorization;
  if (
    !auth ||
    Math.abs(Date.now() - auth.timestamp) > 300_000 ||
    !(await authorizeSealedCastRequest(auth))
  ) {
    res.status(401).json({ error: 'Invalid creator authorization' });
    return;
  }
  if (
    !body.envelope ||
    !['public', 'hidden'].includes(body.policyVisibility) ||
    typeof body.publicHint !== 'string' ||
    body.publicHint.length > 120 ||
    (body.policyVisibility === 'hidden' && body.publicHint !== '')
  ) {
    res.status(400).json({ error: 'Invalid sealed cast metadata' });
    return;
  }
  await prisma.sealed_casts.create({
    data: {
      contract_cast_id: BigInt(auth.castId),
      creator_fid: BigInt(auth.fid),
      encrypted_content: body.envelope,
      public_hint: body.publicHint,
      audience_policy: { visibility: body.policyVisibility }
    }
  });
  res.status(201).json({ result: { id: auth.castId } });
}
