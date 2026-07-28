import type { Hex } from 'viem';

export type SealedCastEnvelope = {
  algorithm: 'AES-GCM';
  iv: string;
  ciphertext: string;
};

export type SealedPolicyVisibility = 'public' | 'hidden';

export type SealedCastReference = { id: string };

export type SealedCastAccessResponse =
  | {
      status: 'granted';
      lockedMessage: string;
      envelope: SealedCastEnvelope;
      contentKeyHandle: Hex;
    }
  | { status: 'denied'; lockedMessage: string };
