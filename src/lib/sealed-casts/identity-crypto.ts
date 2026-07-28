import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function key(): Buffer {
  const value = process.env.SEALED_IDENTITY_ENCRYPTION_KEY;
  if (!value) throw new Error('Identity encryption is not configured');
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32)
    throw new Error('Identity encryption key must be 32 bytes');
  return decoded;
}

export function encryptIdentityValue(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function decryptIdentityValue(value: string): string {
  const parts = value.split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted identity value');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(parts[0], 'base64url')
  );
  decipher.setAuthTag(Buffer.from(parts[1], 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[2], 'base64url')),
    decipher.final()
  ]).toString('utf8');
}
