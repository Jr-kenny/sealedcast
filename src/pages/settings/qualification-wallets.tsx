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

const EMPTY = [false, false, false, false, false];
const WALLET_SLOTS = [
  {
    name: 'Primary wallet',
    description: 'Your main onchain identity'
  },
  {
    name: 'Collectibles wallet',
    description: 'NFTs, passes, and digital collectibles'
  },
  {
    name: 'Token wallet',
    description: 'Tokens used for access requirements'
  },
  {
    name: 'DeFi wallet',
    description: 'Protocol positions and transaction activity'
  },
  {
    name: 'Additional wallet',
    description: 'Any other wallet used for qualification'
  }
] as const;

export default function QualificationWallets(): JSX.Element {
  const { user } = useAuth();
  const { back } = useRouter();
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const [active, setActive] = useState<boolean[]>(EMPTY);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<Hex | null>(null);

  const submit = useCallback(
    async (
      action: 'list' | 'bind' | 'unbind',
      details: Record<string, unknown> = {}
    ): Promise<void> => {
      if (!user || (!user.keyPair && !user.neynarSignerUuid)) return;
      const reader = getSealedReaderAddress(user.id);
      const identity = user.keyPair
        ? { keyPair: user.keyPair }
        : { neynarSignerUuid: user.neynarSignerUuid! };
      const authorization = await createSealedAccessAuthorization({
        fid: user.id,
        castId: `wallet-${action}`,
        reader,
        ...identity
      });
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
    [user]
  );

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
      <SEO title='Qualification Wallets / SealedCast' />
      <MainHeader
        useMobileSidebar
        title='Qualification Wallets'
        useActionButton
        action={back}
      />
      <section className='p-4 sm:p-6'>
        <div className='mb-6 rounded-2xl border border-light-border p-5 dark:border-dark-border'>
          <div className='flex gap-3'>
            <HeroIcon
              className='h-7 w-7 text-main-accent'
              iconName='ShieldCheckIcon'
            />
            <div>
              <h2 className='text-lg font-bold'>Private access identity</h2>
              <p className='mt-1 text-sm text-light-secondary dark:text-dark-secondary'>
                Bind up to five wallets once. SealedCast checks them
                automatically while their addresses remain encrypted through
                iExec Nox.
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
            const walletSlot = WALLET_SLOTS[slot];
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
                    <p className='font-bold'>{walletSlot.name}</p>
                    <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                      {isActive
                        ? `${walletSlot.description} · privately bound`
                        : walletSlot.description}
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
          The signature proves ownership without moving funds. SealedCast relays
          the Ethereum Sepolia transaction.
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
