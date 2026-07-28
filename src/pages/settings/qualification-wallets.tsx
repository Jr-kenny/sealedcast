import { useConnectModal } from '@rainbow-me/rainbowkit';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { HomeLayout, ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Button } from '@components/ui/button';
import { HeroIcon } from '@components/ui/hero-icon';
import { useAuth } from '@lib/context/auth-context';
import { createSealedAccessAuthorization } from '@lib/sealed-casts/access-authorization';
import { getSealedReaderAddress } from '@lib/sealed-casts/reader-identity';
import { walletOwnershipMessage } from '@lib/sealed-casts/wallet-binding';
import cn from 'clsx';
import { useRouter } from 'next/router';
import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import type { Hex } from 'viem';

type DiscordAccount = {
  discord_user_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  created_at: string;
};

const EMPTY = [false, false, false, false, false];

export default function QualificationWallets(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const [active, setActive] = useState<boolean[]>(EMPTY);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<Hex | null>(null);
  const [discordAccount, setDiscordAccount] = useState<DiscordAccount | null>(
    null
  );
  const [discordLoading, setDiscordLoading] = useState(true);
  const [discordAction, setDiscordAction] = useState(false);
  const [discordNotice, setDiscordNotice] = useState<string | null>(null);

  const authorizationFor = useCallback(
    async (castId: string) => {
      if (!user || (!user.keyPair && !user.neynarSignerUuid)) {
        throw new Error('Farcaster sign-in required');
      }
      const identity = user.keyPair
        ? { keyPair: user.keyPair }
        : { neynarSignerUuid: user.neynarSignerUuid! };
      return createSealedAccessAuthorization({
        fid: user.id,
        castId,
        reader: getSealedReaderAddress(user.id),
        ...identity
      });
    },
    [user]
  );

  const submit = useCallback(
    async (
      action: 'list' | 'bind' | 'unbind',
      details: Record<string, unknown> = {}
    ): Promise<void> => {
      const authorization = await authorizationFor(`wallet-${action}`);
      const response = await fetch('/api/sealed-casts/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, authorization, ...details })
      });
      const body = (await response.json()) as {
        result?: { active: boolean[]; txHash?: Hex };
        error?: string;
      };
      if (!response.ok || !body.result) {
        throw new Error(body.error || 'Wallet operation failed');
      }
      setActive(body.result.active);
      if (body.result.txHash) setLastTransaction(body.result.txHash);
    },
    [authorizationFor]
  );

  const loadDiscordStatus = useCallback(async (): Promise<void> => {
    const authorization = await authorizationFor('discord-status');
    const response = await fetch('/api/auth/discord/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorization })
    });
    const body = (await response.json()) as {
      result?: { connected: boolean; account: DiscordAccount | null };
      error?: string;
    };
    if (!response.ok || !body.result) {
      throw new Error(body.error || 'Discord connection could not be loaded');
    }
    setDiscordAccount(body.result.account);
  }, [authorizationFor]);

  useEffect(() => {
    if (!user || (!user.keyPair && !user.neynarSignerUuid)) return;
    let cancelled = false;
    submit('list')
      .catch((reason: Error) => !cancelled && setError(reason.message))
      .finally(() => !cancelled && setLoadingList(false));
    return () => {
      cancelled = true;
    };
  }, [submit, user]);

  useEffect(() => {
    if (!user || (!user.keyPair && !user.neynarSignerUuid)) return;
    let cancelled = false;
    loadDiscordStatus()
      .catch((reason: Error) => !cancelled && setError(reason.message))
      .finally(() => !cancelled && setDiscordLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadDiscordStatus, user]);

  useEffect(() => {
    if (!router.isReady || typeof router.query.discord !== 'string') return;
    const result = router.query.discord;
    setDiscordNotice(
      result === 'connected'
        ? 'Discord connected. It can now qualify private access.'
        : result === 'denied'
        ? 'Discord connection was cancelled.'
        : 'Discord connection failed. Please try again.'
    );
    void router.replace('/settings/qualification-wallets', undefined, {
      shallow: true
    });
  }, [router]);

  async function connectDiscord(): Promise<void> {
    setDiscordAction(true);
    setError(null);
    try {
      const authorization = await authorizationFor('discord-link');
      const response = await fetch('/api/auth/discord/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorization })
      });
      const body = (await response.json()) as {
        result?: { url: string };
        error?: string;
      };
      if (!response.ok || !body.result?.url) {
        throw new Error(
          body.error || 'Discord connection could not be started'
        );
      }
      window.location.assign(body.result.url);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not connect Discord'
      );
      setDiscordAction(false);
    }
  }

  async function disconnectDiscord(): Promise<void> {
    setDiscordAction(true);
    setError(null);
    try {
      const authorization = await authorizationFor('discord-disconnect');
      const response = await fetch('/api/auth/discord/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorization })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || 'Discord could not be disconnected');
      }
      setDiscordAccount(null);
      setDiscordNotice('Discord disconnected from SealedCast.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not disconnect Discord'
      );
    } finally {
      setDiscordAction(false);
    }
  }

  async function bind(slot: number): Promise<void> {
    setError(null);
    if (!address) {
      openConnectModal?.();
      return;
    }
    setLoadingSlot(slot);
    try {
      if (chainId !== sepolia.id)
        await switchChainAsync({ chainId: sepolia.id });
      const expiry = Math.floor(Date.now() / 1000) + 600;
      const ownershipSignature = await signMessageAsync({
        message: walletOwnershipMessage({
          fid: user!.id,
          slot,
          wallet: address,
          expiry
        })
      });
      await submit('bind', {
        slot,
        wallet: address,
        ownershipSignature,
        ownershipExpiry: expiry
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not bind wallet'
      );
    } finally {
      setLoadingSlot(null);
    }
  }

  async function unbind(slot: number): Promise<void> {
    setLoadingSlot(slot);
    setError(null);
    try {
      await submit('unbind', { slot });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not unbind wallet'
      );
    } finally {
      setLoadingSlot(null);
    }
  }

  return (
    <MainContainer>
      <SEO title='Qualification identities / SealedCast' />
      <MainHeader
        useMobileSidebar
        title='Qualification identities'
        useActionButton
        action={router.back}
      />
      <section className='p-4 sm:p-6'>
        <div className='mb-6 rounded-2xl border border-light-border p-5 dark:border-dark-border'>
          <div className='flex gap-3'>
            <HeroIcon
              className='h-7 w-7 text-main-accent'
              iconName='ShieldCheckIcon'
            />
            <div>
              <h2 className='text-lg font-bold'>Private access identities</h2>
              <p className='mt-1 text-sm text-light-secondary dark:text-dark-secondary'>
                Connect the accounts and wallets that can qualify you for a
                sealed cast. SealedCast checks them automatically and protects
                private requirements through iExec Nox.
              </p>
            </div>
          </div>
        </div>
        {error && (
          <div
            className='mb-4 rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red'
            role='alert'
          >
            {error}
          </div>
        )}
        {discordNotice && (
          <div className='mb-4 rounded-xl border border-main-accent/40 bg-main-accent/10 p-4 text-sm text-main-accent'>
            {discordNotice}
          </div>
        )}
        <h2 className='mb-3 text-lg font-bold'>Social identities</h2>
        <div className='mb-7 space-y-3'>
          <article className='flex items-center justify-between gap-4 rounded-2xl border border-light-border p-4 dark:border-dark-border'>
            <div className='flex items-center gap-3'>
              <span className='flex h-10 w-10 items-center justify-center rounded-full bg-main-accent/10 font-bold text-main-accent'>
                F
              </span>
              <div>
                <p className='font-bold'>Farcaster</p>
                <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                  @{user?.username} · connected for account and follow rules
                </p>
              </div>
            </div>
            <span className='text-sm font-bold text-main-accent'>
              Connected
            </span>
          </article>
          <article
            className='flex items-center justify-between gap-4 rounded-2xl border border-light-border p-4 dark:border-dark-border'
            aria-busy={discordLoading || discordAction}
          >
            <div className='flex items-center gap-3'>
              <span className='flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2]/15 font-bold text-[#5865F2]'>
                D
              </span>
              <div>
                <p className='font-bold'>Discord</p>
                <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                  {discordAccount
                    ? `${
                        discordAccount.global_name || discordAccount.username
                      } · @${discordAccount.username}`
                    : 'Server membership, roles, and account-age access rules'}
                </p>
              </div>
            </div>
            <Button
              className={cn(
                'shrink-0 px-4 py-2 text-sm',
                discordAccount && 'text-accent-red'
              )}
              disabled={discordLoading}
              loading={discordAction}
              onClick={() =>
                void (discordAccount ? disconnectDiscord() : connectDiscord())
              }
            >
              {discordAccount ? 'Disconnect' : 'Connect Discord'}
            </Button>
          </article>
        </div>
        <h2 className='mb-3 text-lg font-bold'>Qualification wallets</h2>
        {lastTransaction && (
          <a
            className='mb-4 block rounded-xl border border-main-accent/40 bg-main-accent/10 p-4 text-sm text-main-accent hover:underline'
            href={`https://sepolia.etherscan.io/tx/${lastTransaction}`}
            rel='noreferrer'
            target='_blank'
          >
            Wallet binding confirmed on Ethereum Sepolia. View transaction.
          </a>
        )}
        <div className='space-y-3' aria-busy={loadingList}>
          {active.map((isActive, slot) => {
            return (
              <article
                className='flex items-center justify-between gap-4 rounded-2xl border border-light-border p-4 dark:border-dark-border'
                key={`wallet-${slot + 1}`}
              >
                <div className='flex items-center gap-3'>
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      isActive
                        ? 'bg-main-accent/10 text-main-accent'
                        : 'bg-light-primary/10 dark:bg-dark-primary/10'
                    )}
                  >
                    <HeroIcon
                      className='h-5 w-5'
                      iconName={isActive ? 'CheckIcon' : 'WalletIcon'}
                    />
                  </span>
                  <div>
                    <p className='font-bold'>Linked wallet {slot + 1}</p>
                    <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                      {isActive
                        ? 'Included in every private wallet requirement check'
                        : 'Add another wallet to your private identity set'}
                    </p>
                  </div>
                </div>
                <Button
                  className={cn(
                    'shrink-0 px-4 py-2 text-sm',
                    isActive && 'text-accent-red'
                  )}
                  disabled={loadingList}
                  loading={loadingSlot === slot}
                  onClick={() => void (isActive ? unbind(slot) : bind(slot))}
                >
                  {isActive
                    ? 'Unbind'
                    : address
                    ? 'Bind wallet'
                    : 'Connect to prove'}
                </Button>
              </article>
            );
          })}
        </div>
        <p className='mt-5 text-xs text-light-secondary dark:text-dark-secondary'>
          A rule checks all linked wallets. Any linked wallet can satisfy an
          NFT, token, DeFi, or transaction requirement. The signature proves
          ownership without moving funds, and SealedCast relays the Ethereum
          Sepolia transaction.
        </p>
      </section>
    </MainContainer>
  );
}

QualificationWallets.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      <HomeLayout>{page}</HomeLayout>
    </MainLayout>
  </ProtectedLayout>
);
