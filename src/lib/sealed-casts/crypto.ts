import { bytesToHex, hexToBytes, padHex, type Hex } from 'viem';
import type { SealedCastEnvelope } from '@lib/types/sealed-cast';

function bytesToBase64(value: Uint8Array): string {
  let binary = '';
  value.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export async function encryptSealedCast(plaintext: string): Promise<{
  envelope: SealedCastEnvelope;
  contentKey: Uint8Array;
}> {
  const contentKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw',
    contentKey,
    'AES-GCM',
    false,
    ['encrypt']
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    contentKey,
    envelope: {
      algorithm: 'AES-GCM',
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    }
  };
}

export async function decryptSealedCast(
  envelope: SealedCastEnvelope,
  base64Key: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(base64Key),
    'AES-GCM',
    false,
    ['decrypt']
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.ciphertext)
  );
  return new TextDecoder().decode(plaintext);
}

export function sealedContentKeyToUint256(key: Uint8Array): bigint {
  return BigInt(bytesToHex(key));
}

export function uint256ToBase64(value: bigint): string {
  return bytesToBase64(
    hexToBytes(padHex(`0x${value.toString(16)}` as Hex, { size: 32 }))
  );
}
