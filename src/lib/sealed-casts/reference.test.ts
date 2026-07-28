import {
  resolveSealedCastReference,
  sealedCastReferenceUrl
} from './reference';

describe('sealed cast references', () => {
  const originalUrl = process.env.NEXT_PUBLIC_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_URL = originalUrl;
  });

  it('builds references from the configured SealedCast origin', () => {
    process.env.NEXT_PUBLIC_URL = 'https://sealedcast.example/';
    expect(sealedCastReferenceUrl('42')).toBe(
      'https://sealedcast.example/sealed/42'
    );
  });

  it('recognizes a SealedCast reference without exposing policy metadata', () => {
    expect(
      resolveSealedCastReference([
        { url: 'https://sealedcast.example/sealed/42' }
      ])
    ).toEqual({ id: '42' });
  });

  it('rejects malformed identifiers', () => {
    expect(
      resolveSealedCastReference([
        { url: 'https://sealedcast.example/sealed/not-a-number' }
      ])
    ).toBeNull();
  });
});
