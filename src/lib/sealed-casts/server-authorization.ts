import { hexToBytes } from 'viem';
import { prisma } from '@lib/prisma';
import { getApprovedNeynarSigner } from '@lib/neynar';
import {
  verifySealedAccessSignature,
  type SealedAccessAuthorization
} from './access-authorization';

export async function authorizeSealedCastRequest(
  authorization: SealedAccessAuthorization
): Promise<boolean> {
  if (!(await verifySealedAccessSignature(authorization))) return false;
  if (authorization.provider === 'neynar') {
    return Boolean(
      await getApprovedNeynarSigner(authorization.signerUuid, authorization.fid)
    );
  }
  const signer = await prisma.signers.findFirst({
    where: {
      fid: BigInt(authorization.fid),
      key: Buffer.from(hexToBytes(authorization.signerPublicKey)),
      removed_at: null
    }
  });
  return Boolean(signer);
}
