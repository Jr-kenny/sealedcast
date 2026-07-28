import {
  createPublicClient,
  getAddress,
  http,
  parseUnits,
  type Address
} from 'viem';
import { sepolia } from 'viem/chains';
import { prisma } from '@lib/prisma';
import type {
  SealedAccessPolicy,
  SealedAccessRule
} from '@lib/types/sealed-cast';
import {
  fetchCurrentDiscordGuildMember,
  refreshDiscordToken,
  type DiscordGuildMember
} from '@lib/discord/client';
import {
  decryptDiscordToken,
  encryptDiscordToken
} from '@lib/discord/token-crypto';
import { decryptIdentityValue } from './identity-crypto';
import { validateSealedAccessPolicy } from './policy';

const BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  }
] as const;

const ERC20_ABI = [
  ...BALANCE_ABI,
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'decimals', type: 'uint8' }]
  }
] as const;

function discordCreatedAt(id: string): number {
  return Number((BigInt(id) >> 22n) + 1420070400000n);
}

async function discordAccess(fid: bigint): Promise<{
  userId: string;
  accessToken: string;
} | null> {
  const link = await prisma.sealed_discord_links.findUnique({ where: { fid } });
  if (!link) return null;
  if (link.token_expires_at.getTime() > Date.now() + 60_000) {
    return {
      userId: link.discord_user_id,
      accessToken: decryptDiscordToken(link.encrypted_access_token)
    };
  }
  const token = await refreshDiscordToken(
    decryptDiscordToken(link.encrypted_refresh_token)
  );
  await prisma.sealed_discord_links.update({
    where: { fid },
    data: {
      encrypted_access_token: encryptDiscordToken(token.access_token),
      encrypted_refresh_token: encryptDiscordToken(token.refresh_token),
      token_expires_at: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope,
      updated_at: new Date()
    }
  });
  return { userId: link.discord_user_id, accessToken: token.access_token };
}

export async function evaluateSealedPolicy(
  fid: bigint,
  policy: SealedAccessPolicy
): Promise<boolean> {
  validateSealedAccessPolicy(policy);
  const [walletRows, discord] = await Promise.all([
    prisma.sealed_wallet_links.findMany({ where: { fid } }),
    discordAccess(fid)
  ]);
  const wallets = walletRows.map((row) =>
    getAddress(decryptIdentityValue(row.encrypted_address))
  );
  const members = new Map<string, Promise<DiscordGuildMember | null>>();
  const membership = (guildId: string): Promise<DiscordGuildMember | null> => {
    if (!discord) return Promise.resolve(null);
    const existing = members.get(guildId);
    if (existing) return existing;
    const request = fetchCurrentDiscordGuildMember(
      discord.accessToken,
      guildId
    );
    members.set(guildId, request);
    return request;
  };
  const results = await Promise.all(
    policy.rules.map((rule) =>
      evaluateRule(fid, wallets, discord, membership, rule)
    )
  );
  return policy.mode === 'all' ? results.every(Boolean) : results.some(Boolean);
}

async function evaluateRule(
  fid: bigint,
  wallets: Address[],
  discord: { userId: string; accessToken: string } | null,
  membership: (guildId: string) => Promise<DiscordGuildMember | null>,
  rule: SealedAccessRule
): Promise<boolean> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  });
  switch (rule.type) {
    case 'nft-ownership': {
      const balances = await Promise.all(
        wallets.map((wallet) =>
          client.readContract({
            address: getAddress(rule.contract),
            abi: BALANCE_ABI,
            functionName: 'balanceOf',
            args: [wallet]
          })
        )
      );
      return balances.some((balance) => balance >= BigInt(rule.minCount));
    }
    case 'erc20-balance': {
      const token = getAddress(rule.contract);
      const decimals = await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'decimals'
      });
      const minimum = parseUnits(rule.minBalance, decimals);
      const balances = await Promise.all(
        wallets.map((wallet) =>
          client.readContract({
            address: token,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [wallet]
          })
        )
      );
      return balances.some((balance) => balance >= minimum);
    }
    case 'discord-member':
      return Boolean(await membership(rule.guildId));
    case 'discord-role':
      return Boolean(
        (await membership(rule.guildId))?.roles.includes(rule.roleId)
      );
    case 'discord-account-age':
      return Boolean(
        discord &&
          Date.now() - discordCreatedAt(discord.userId) >=
            Number(rule.minDays) * 86_400_000
      );
    case 'farcaster-following':
      return Boolean(
        await prisma.links.findFirst({
          where: {
            fid,
            target_fid: BigInt(rule.targetFid),
            type: 'follow',
            deleted_at: null
          }
        })
      );
    case 'farcaster-account-age': {
      const account = await prisma.fids.findUnique({ where: { fid } });
      return Boolean(
        account &&
          Date.now() - account.registered_at.getTime() >=
            Number(rule.minDays) * 86_400_000
      );
    }
    case 'farcaster-followers':
      return (
        (await prisma.links.count({
          where: { target_fid: fid, type: 'follow', deleted_at: null }
        })) >= Number(rule.minFollowers)
      );
  }
}
