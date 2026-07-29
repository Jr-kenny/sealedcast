import { useEffect, useState } from 'react';
import type { KeyPair } from '@lib/types/keypair';
import type { SealedCastAccessResponse } from '@lib/types/sealed-cast';
import { createSealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { decryptSealedCast } from '@lib/sealed-casts/crypto';
import {
  decryptSealedContentKey,
  getSealedReaderAddress
} from '@lib/sealed-casts/reader-identity';

type State =
  | { status: 'loading' }
  | { status: 'locked'; hint: string }
  | { status: 'unlocked'; plaintext: string }
  | { status: 'error'; message: string };

export function useSealedCastAccess(
  castId: string,
  fid?: string,
  keyPair?: KeyPair,
  neynarSignerUuid?: string
): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!fid || (!keyPair && !neynarSignerUuid)) {
      setState({ status: 'locked', hint: 'Sign in to check access' });
      return;
    }
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const reader = getSealedReaderAddress(fid!);
        const identity = keyPair
          ? { keyPair }
          : { neynarSignerUuid: neynarSignerUuid! };
        const authorization = await createSealedAccessAuthorization({
          fid: fid!,
          castId,
          reader,
          ...identity
        });
        const response = await fetch(`/api/sealed-casts/${castId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authorization)
        });
        const responseText = await response.text();
        let body: SealedCastAccessResponse | { error: string };
        try {
          body = JSON.parse(responseText) as
            | SealedCastAccessResponse
            | { error: string };
        } catch {
          throw new Error('Private access check is temporarily unavailable');
        }
        if (!response.ok || 'error' in body) {
          throw new Error('error' in body ? body.error : 'Access check failed');
        }
        if (body.status === 'denied') {
          if (!cancelled)
            setState({ status: 'locked', hint: body.lockedMessage });
          return;
        }
        const key = await decryptSealedContentKey(fid!, body.contentKeyHandle);
        if (!key) {
          if (!cancelled)
            setState({ status: 'locked', hint: body.lockedMessage });
          return;
        }
        const plaintext = await decryptSealedCast(body.envelope, key);
        if (!cancelled) setState({ status: 'unlocked', plaintext });
      } catch (reason) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: reason instanceof Error ? reason.message : 'Access failed'
          });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [castId, fid, keyPair, neynarSignerUuid]);

  return state;
}
