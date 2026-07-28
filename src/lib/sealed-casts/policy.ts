import { isAddress } from 'viem';
import { keccak256, stringToHex, type Hex } from 'viem';
import type {
  SealedAccessPolicy,
  SealedAccessRule
} from '@lib/types/sealed-cast';

function positive(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value) && Number(value) > 0;
}

function positiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}

export function validateSealedAccessPolicy(policy: SealedAccessPolicy): void {
  if (!['all', 'any'].includes(policy.mode)) {
    throw new Error('Choose how multiple requirements should be combined');
  }
  if (policy.rules.length === 0)
    throw new Error('Add at least one requirement');
  if (policy.rules.length > 5) throw new Error('Use at most five requirements');
  if (
    new Set(policy.rules.map((rule) => rule.id)).size !== policy.rules.length
  ) {
    throw new Error('Every requirement must be unique');
  }
  for (const rule of policy.rules) validateRule(rule);
}

function validateRule(rule: SealedAccessRule): void {
  switch (rule.type) {
    case 'nft-ownership':
      if (!isAddress(rule.contract))
        throw new Error('Enter a valid NFT contract address');
      if (!positiveInteger(rule.minCount))
        throw new Error('Minimum NFT count must be a positive whole number');
      return;
    case 'erc20-balance':
      if (!isAddress(rule.contract))
        throw new Error('Enter a valid token contract address');
      if (!positive(rule.minBalance))
        throw new Error('Minimum token balance must be positive');
      return;
    case 'discord-member':
      if (!positiveInteger(rule.guildId))
        throw new Error('Enter a valid Discord server ID');
      return;
    case 'discord-role':
      if (!positiveInteger(rule.guildId) || !positiveInteger(rule.roleId))
        throw new Error('Enter valid Discord server and role IDs');
      return;
    case 'discord-account-age':
    case 'farcaster-account-age':
      if (!positiveInteger(rule.minDays))
        throw new Error('Account age must be a positive number of days');
      return;
    case 'farcaster-following':
      if (!positiveInteger(rule.targetFid))
        throw new Error('Enter a valid Farcaster FID');
      return;
    case 'farcaster-followers':
      if (!positiveInteger(rule.minFollowers))
        throw new Error('Follower count must be a positive whole number');
      return;
    default:
      throw new Error('Unsupported access requirement');
  }
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function ruleSummary(rule: SealedAccessRule): string {
  switch (rule.type) {
    case 'nft-ownership':
      return `Own ${rule.minCount}+ NFT from ${shortAddress(rule.contract)}`;
    case 'erc20-balance':
      return `Hold ${rule.minBalance}+ tokens from ${shortAddress(
        rule.contract
      )}`;
    case 'discord-member':
      return `Join Discord server ${rule.guildId}`;
    case 'discord-role':
      return `Have Discord role ${rule.roleId}`;
    case 'discord-account-age':
      return `Discord account ${rule.minDays}+ days old`;
    case 'farcaster-following':
      return `Follow Farcaster FID ${rule.targetFid}`;
    case 'farcaster-account-age':
      return `Farcaster account ${rule.minDays}+ days old`;
    case 'farcaster-followers':
      return `Have ${rule.minFollowers}+ Farcaster followers`;
  }
}

export function publicPolicySummary(policy: SealedAccessPolicy): string {
  const joiner = policy.mode === 'all' ? ' AND ' : ' OR ';
  const summary = policy.rules.map(ruleSummary).join(joiner);
  return summary.length <= 120 ? summary : `${summary.slice(0, 117)}…`;
}

function canonicalRule(rule: SealedAccessRule): Record<string, string> {
  switch (rule.type) {
    case 'nft-ownership':
      return {
        type: rule.type,
        contract: rule.contract.toLowerCase(),
        minCount: rule.minCount
      };
    case 'erc20-balance':
      return {
        type: rule.type,
        contract: rule.contract.toLowerCase(),
        minBalance: rule.minBalance
      };
    case 'discord-member':
      return { type: rule.type, guildId: rule.guildId };
    case 'discord-role':
      return { type: rule.type, guildId: rule.guildId, roleId: rule.roleId };
    case 'discord-account-age':
    case 'farcaster-account-age':
      return { type: rule.type, minDays: rule.minDays };
    case 'farcaster-following':
      return { type: rule.type, targetFid: rule.targetFid };
    case 'farcaster-followers':
      return { type: rule.type, minFollowers: rule.minFollowers };
  }
}

export function policyCommitment(policy: SealedAccessPolicy): Hex {
  validateSealedAccessPolicy(policy);
  return keccak256(
    stringToHex(
      JSON.stringify({
        mode: policy.mode,
        rules: policy.rules.map(canonicalRule)
      })
    )
  );
}
