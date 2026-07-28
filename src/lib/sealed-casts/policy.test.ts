import {
  policyCommitment,
  publicPolicySummary,
  validateSealedAccessPolicy
} from './policy';

describe('sealed access policy', () => {
  const policy = {
    mode: 'all' as const,
    rules: [
      {
        id: 'nft-rule',
        type: 'nft-ownership' as const,
        contract: '0x0000000000000000000000000000000000000001',
        minCount: '1'
      },
      {
        id: 'farcaster-rule',
        type: 'farcaster-following' as const,
        targetFid: '194'
      }
    ]
  };

  it('validates and summarizes real requirements', () => {
    expect(() => validateSealedAccessPolicy(policy)).not.toThrow();
    expect(publicPolicySummary(policy)).toContain(' AND ');
  });

  it('commits to rule contents without UI-only IDs', () => {
    expect(policyCommitment(policy)).toBe(
      policyCommitment({
        ...policy,
        rules: policy.rules.map((rule, index) => ({
          ...rule,
          id: `different-${index}`
        }))
      })
    );
    expect(policyCommitment(policy)).not.toBe(
      policyCommitment({
        ...policy,
        rules: [
          {
            id: 'nft-rule',
            type: 'nft-ownership',
            contract: '0x0000000000000000000000000000000000000001',
            minCount: '2'
          },
          policy.rules[1]
        ]
      })
    );
  });

  it('rejects an empty policy', () => {
    expect(() =>
      validateSealedAccessPolicy({ mode: 'any', rules: [] })
    ).toThrow('Add at least one requirement');
  });
});
