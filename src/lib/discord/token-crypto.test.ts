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
    const last = encrypted.at(-1) === 'a' ? 'b' : 'a';
    expect(() =>
      decryptDiscordToken(`${encrypted.slice(0, -1)}${last}`)
    ).toThrow();
  });
});
