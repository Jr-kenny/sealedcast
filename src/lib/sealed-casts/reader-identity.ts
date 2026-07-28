import { createWalletClient, http, type Address, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { uint256ToBase64 } from './crypto';

const STORAGE_KEY = 'sealed-cast-reader-keys';
type StoredKeys = Record<string, Hex>;

function storedKeys(): StoredKeys {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as StoredKeys;
  } catch {
    return {};
  }
}

export function getOrCreateSealedReaderPrivateKey(fid: string): Hex {
  const keys = storedKeys();
  if (keys[fid]) return keys[fid];
  keys[fid] = generatePrivateKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  return keys[fid];
}

export function getSealedReaderAddress(fid: string): Address {
  return privateKeyToAccount(getOrCreateSealedReaderPrivateKey(fid)).address;
}

export function createSealedReaderWalletClient(fid: string) {
  return createWalletClient({
    account: privateKeyToAccount(getOrCreateSealedReaderPrivateKey(fid)),
    chain: sepolia,
    transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)
  });
}

export async function decryptSealedContentKey(
  fid: string,
  handle: Hex
): Promise<string | null> {
  const { createViemHandleClient } = await import('@iexec-nox/handle');
  const client = await createViemHandleClient(
    createSealedReaderWalletClient(fid)
  );
  const decrypted = await client.decrypt(handle);
  if (
    decrypted.solidityType !== 'uint256' ||
    typeof decrypted.value !== 'bigint'
  ) {
    throw new Error('Nox returned an unexpected content key type');
  }
  return decrypted.value === 0n ? null : uint256ToBase64(decrypted.value);
}
