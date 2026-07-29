import type { Hex } from 'viem';

export type SealedCastEnvelope = {
  algorithm: 'AES-GCM';
  iv: string;
  ciphertext: string;
};

export type SealedPolicyVisibility = 'public' | 'hidden';

export type SealedRuleType =
  | 'nft-ownership'
  | 'erc20-balance'
  | 'discord-member'
  | 'discord-role'
  | 'discord-account-age'
  | 'farcaster-following'
  | 'farcaster-account-age'
  | 'farcaster-followers';

type RuleBase<T extends SealedRuleType> = { id: string; type: T };

export type SealedAccessRule =
  | (RuleBase<'nft-ownership'> & { contract: string; minCount: string })
  | (RuleBase<'erc20-balance'> & { contract: string; minBalance: string })
  | (RuleBase<'discord-member'> & { guildId: string })
  | (RuleBase<'discord-role'> & { guildId: string; roleId: string })
  | (RuleBase<'discord-account-age'> & { minDays: string })
  | (RuleBase<'farcaster-following'> & { targetFid: string })
  | (RuleBase<'farcaster-account-age'> & { minDays: string })
  | (RuleBase<'farcaster-followers'> & { minFollowers: string });

export type SealedAccessPolicy = {
  mode: 'all' | 'any';
  rules: SealedAccessRule[];
};

export type SealedCastReference = { id: string };

export type SealedCastPublicMetadata = {
  id: string;
  creatorFid: string;
  lockedMessage: string;
};

export type SealedCastAccessResponse =
  | {
      status: 'granted';
      lockedMessage: string;
      envelope: SealedCastEnvelope;
      contentKeyHandle: Hex;
    }
  | { status: 'denied'; lockedMessage: string };
