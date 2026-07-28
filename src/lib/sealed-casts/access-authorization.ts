import * as ed from '@noble/ed25519';
import { bytesToHex, verifyMessage, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { KeyPair } from '@lib/types/keypair';
import { getOrCreateSealedReaderPrivateKey } from './reader-identity';

type AuthorizationFields = {
  fid: string;
  castId: string;
  reader: `0x${string}`;
  timestamp: number;
};

type AuthorizationRequest = Omit<AuthorizationFields, 'timestamp'>;

export type SealedAccessAuthorization = AuthorizationFields &
  (
    | {
        provider: 'farcaster-signer';
        signerPublicKey: `0x${string}`;
        signature: `0x${string}`;
      }
    | {
        provider: 'neynar';
        signerUuid: string;
        signature: Hex;
      }
  );

function message({
  fid,
  castId,
  reader,
  timestamp
}: AuthorizationFields): Uint8Array {
  return new TextEncoder().encode(
    `sealed-cast-access:${fid}:${castId}:${reader.toLowerCase()}:${timestamp}`
  );
}

export type AuthorizationIdentity =
  | { keyPair: KeyPair; neynarSignerUuid?: never }
  | { keyPair?: never; neynarSignerUuid: string };

export async function createSealedAccessAuthorization({
  fid,
  castId,
  reader,
  keyPair,
  neynarSignerUuid
}: AuthorizationRequest &
  AuthorizationIdentity): Promise<SealedAccessAuthorization> {
  const timestamp = Date.now();
  const fields = { fid, castId, reader, timestamp };
  if (neynarSignerUuid) {
    const account = privateKeyToAccount(getOrCreateSealedReaderPrivateKey(fid));
    return {
      ...fields,
      provider: 'neynar',
      signerUuid: neynarSignerUuid,
      signature: await account.signMessage({
        message: { raw: message(fields) }
      })
    };
  }
  if (!keyPair) throw new Error('A Farcaster signer is required');
  const signature = await ed.signAsync(
    message(fields),
    keyPair.privateKey.slice(2)
  );
  return {
    ...fields,
    provider: 'farcaster-signer',
    signerPublicKey: keyPair.publicKey,
    signature: bytesToHex(signature)
  };
}

export async function verifySealedAccessSignature(
  authorization: SealedAccessAuthorization
): Promise<boolean> {
  const { signature, ...rest } = authorization;
  const fields: AuthorizationFields = {
    fid: authorization.fid,
    castId: authorization.castId,
    reader: authorization.reader,
    timestamp: authorization.timestamp
  };
  if (rest.provider === 'neynar') {
    return verifyMessage({
      address: authorization.reader,
      message: { raw: message(fields) },
      signature
    });
  }
  return ed.verifyAsync(
    signature.slice(2),
    message(fields),
    rest.signerPublicKey.slice(2)
  );
}
