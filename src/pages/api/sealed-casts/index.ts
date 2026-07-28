import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import type { SealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { authorizeSealedCastRequest } from '@lib/sealed-casts/server-authorization';
import type {
  SealedAccessPolicy,
  SealedCastEnvelope,
  SealedPolicyVisibility
} from '@lib/types/sealed-cast';
import {
  policyCommitment,
  validateSealedAccessPolicy
} from '@lib/sealed-casts/policy';
import type { Hex } from 'viem';

type Body = {
  authorization: SealedAccessAuthorization;
  envelope: SealedCastEnvelope;
  publicHint: string;
  policyVisibility: SealedPolicyVisibility;
  policy: SealedAccessPolicy;
  policyHash: Hex;
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
  let validPolicy = false;
  try {
    validateSealedAccessPolicy(body.policy);
    validPolicy = policyCommitment(body.policy) === body.policyHash;
  } catch {
    validPolicy = false;
  }
  if (
    !body.envelope ||
    !validPolicy ||
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
      audience_policy: {
        visibility: body.policyVisibility,
        policy: body.policy,
        commitment: body.policyHash
      }
    }
  });
  res.status(201).json({ result: { id: auth.castId } });
}
