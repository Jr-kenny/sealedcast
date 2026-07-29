import { getNeynarUser } from '@lib/neynar';
import { prisma } from '@lib/prisma';
import { evaluateSealedPolicy } from './evaluate-policy';

jest.mock('@lib/neynar', () => ({ getNeynarUser: jest.fn() }));
jest.mock('@lib/prisma', () => ({
  prisma: {
    sealed_wallet_links: { findMany: jest.fn() },
    sealed_discord_links: { findUnique: jest.fn() }
  }
}));

const mockedGetNeynarUser = jest.mocked(getNeynarUser);
const mockedPrisma = jest.mocked(prisma, { shallow: false });

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrisma.sealed_wallet_links.findMany.mockResolvedValue([]);
  mockedPrisma.sealed_discord_links.findUnique.mockResolvedValue(null);
});

it('checks Farcaster account age against current Neynar profile data', async () => {
  mockedGetNeynarUser.mockResolvedValue({
    createdAt: new Date('2024-06-18T15:56:57.000Z')
  } as never);

  await expect(
    evaluateSealedPolicy(695127n, {
      mode: 'all',
      rules: [
        { id: 'account-age', type: 'farcaster-account-age', minDays: '300' }
      ]
    })
  ).resolves.toBe(true);

  expect(mockedGetNeynarUser).toHaveBeenCalledWith('695127');
});

it('checks Farcaster follows through Neynar', async () => {
  mockedGetNeynarUser.mockResolvedValue({ viewerFollowing: true } as never);

  await expect(
    evaluateSealedPolicy(695127n, {
      mode: 'all',
      rules: [{ id: 'following', type: 'farcaster-following', targetFid: '3' }]
    })
  ).resolves.toBe(true);

  expect(mockedGetNeynarUser).toHaveBeenCalledWith('3', '695127');
});

it('checks Farcaster follower counts through Neynar', async () => {
  mockedGetNeynarUser.mockResolvedValue({ followerCount: 12 } as never);

  await expect(
    evaluateSealedPolicy(695127n, {
      mode: 'all',
      rules: [
        {
          id: 'follower-count',
          type: 'farcaster-followers',
          minFollowers: '10'
        }
      ]
    })
  ).resolves.toBe(true);

  expect(mockedGetNeynarUser).toHaveBeenCalledWith('695127');
});
