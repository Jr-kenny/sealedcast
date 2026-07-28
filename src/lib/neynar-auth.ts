import type { NeynarAuth } from './types/neynar';

const STORAGE_KEY = 'sealedcast-neynar-auth';

export function getNeynarAuth(): NeynarAuth | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const auth = JSON.parse(value) as NeynarAuth;
    return auth.fid && auth.signerUuid ? auth : null;
  } catch {
    return null;
  }
}

export function setNeynarAuth(auth: NeynarAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function removeNeynarAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}
