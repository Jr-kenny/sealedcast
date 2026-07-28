import { lockedMessageForPolicy } from './visibility';

describe('lockedMessageForPolicy', () => {
  it('shows the author-provided requirement in public mode', () => {
    expect(lockedMessageForPolicy('public', 'Hold the Founders NFT')).toBe(
      'Hold the Founders NFT'
    );
  });

  it('never exposes the author-provided requirement in hidden mode', () => {
    expect(
      lockedMessageForPolicy('hidden', 'Secret Discord role: core-team')
    ).toBe('Access requirements are private');
  });

  it('treats records without visibility metadata as hidden', () => {
    expect(lockedMessageForPolicy(undefined, 'Legacy private rule')).toBe(
      'Access requirements are private'
    );
  });
});
