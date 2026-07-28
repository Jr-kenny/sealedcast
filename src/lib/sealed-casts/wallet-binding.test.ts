import { TextDecoder, TextEncoder } from 'util';
import { walletOwnershipMessage } from './wallet-binding';

Object.assign(global, { TextDecoder, TextEncoder });

const privateKey =
  '0x59c6995e998f97a5a0044976f7d4cf1b6b5f0e04a6b5b67b7f8a765a3ef23b90' as const;

describe('qualification wallet ownership proof', () => {
  it('binds the signature to the FID, slot, wallet, and expiry', async () => {
    const [{ verifyMessage }, { privateKeyToAccount }] = await Promise.all([
      import('viem'),
      import('viem/accounts')
    ]);
    const account = privateKeyToAccount(privateKey);
    const fields = {
      fid: '695127',
      slot: 2,
      wallet: account.address,
      expiry: 1_800_000_000
    } as const;
    const message = walletOwnershipMessage(fields);
    const signature = await account.signMessage({ message });

    await expect(
      verifyMessage({ address: account.address, message, signature })
    ).resolves.toBe(true);
    await expect(
      verifyMessage({
        address: account.address,
        message: walletOwnershipMessage({ ...fields, slot: 3 }),
        signature
      })
    ).resolves.toBe(false);
  });

  it('explains that signing does not submit a transaction', async () => {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey);
    const message = walletOwnershipMessage({
      fid: '695127',
      slot: 0,
      wallet: account.address,
      expiry: 1_800_000_000
    });

    expect(message).toContain('Slot: 1 of 5');
    expect(message).toContain('It does not send a transaction.');
  });
});
