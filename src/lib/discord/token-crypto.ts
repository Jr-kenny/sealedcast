import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function encryptionKey(): Buffer {
  const encoded = process.env.DISCORD_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error('Discord token encryption is not configured');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) {
    throw new Error('Discord token encryption key must be 32 bytes');
  }
  return key;
}

export function encryptDiscordToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final()
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function decryptDiscordToken(payload: string): string {
  const [ivValue, tagValue, ciphertextValue, extra] = payload.split('.');
  if (!ivValue || !tagValue || !ciphertextValue || extra) {
    throw new Error('Invalid encrypted Discord token');
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}
