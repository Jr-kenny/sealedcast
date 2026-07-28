import type { Address } from 'viem';

export function walletOwnershipMessage({
  fid,
  slot,
  wallet,
  expiry
}: {
  fid: string;
  slot: number;
  wallet: Address;
  expiry: number;
}): string {
  return [
    'SealedCast qualification wallet',
    '',
    `Farcaster FID: ${fid}`,
    `Wallet: ${wallet.toLowerCase()}`,
    `Slot: ${slot + 1} of 5`,
    `Expires: ${expiry}`,
    '',
    'Signing proves wallet ownership. It does not send a transaction.'
  ].join('\n');
}
