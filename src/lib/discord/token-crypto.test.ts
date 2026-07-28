import { decryptDiscordToken, encryptDiscordToken } from './token-crypto';

describe('Discord token encryption', () => {
  const previousKey = process.env.DISCORD_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.DISCORD_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      'base64'
    );
  });

  afterAll(() => {
    process.env.DISCORD_TOKEN_ENCRYPTION_KEY = previousKey;
  });

  it('round trips a token without storing plaintext', () => {
    const token = 'discord-access-token';
    const encrypted = encryptDiscordToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptDiscordToken(encrypted)).toBe(token);
  });

  it('rejects a modified encrypted token', () => {
    const encrypted = encryptDiscordToken('discord-access-token');
    const [iv, tag, ciphertext] = encrypted.split('.');
    const changed = tag[0] === 'a' ? 'b' : 'a';
    expect(() =>
      decryptDiscordToken(`${iv}.${changed}${tag.slice(1)}.${ciphertext}`)
    ).toThrow();
  });
});
