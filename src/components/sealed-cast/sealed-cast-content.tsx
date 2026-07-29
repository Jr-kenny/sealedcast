import { HeroIcon } from '@components/ui/hero-icon';
import { useAuth } from '@lib/context/auth-context';
import { fetchJSON } from '@lib/fetch';
import { useSealedCastAccess } from '@lib/hooks/useSealedCastAccess';
import type { SealedCastPublicMetadata } from '@lib/types/sealed-cast';
import useSWR from 'swr';

const PRIVATE_REQUIREMENT_MESSAGE = 'Access requirements are private';

function AccessInfo({
  lockedMessage
}: {
  lockedMessage?: string;
}): JSX.Element {
  const requirementIsPublic =
    lockedMessage && lockedMessage !== PRIVATE_REQUIREMENT_MESSAGE;

  return (
    <div className='group relative ml-auto self-start'>
      <button
        type='button'
        aria-label='Why is this cast sealed?'
        className='rounded-full p-1 text-light-secondary outline-none hover:bg-light-primary/10 hover:text-main-accent focus:bg-light-primary/10 focus:text-main-accent dark:text-dark-secondary dark:hover:bg-dark-primary/10 dark:focus:bg-dark-primary/10'
      >
        <HeroIcon className='h-5 w-5' iconName='InformationCircleIcon' />
      </button>
      <div
        role='tooltip'
        className='invisible absolute right-0 top-8 z-20 w-72 rounded-xl border border-light-border bg-main-background p-4 text-left text-sm font-normal opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:border-dark-border'
      >
        <p className='font-bold text-light-primary dark:text-dark-primary'>
          Why this cast is hidden
        </p>
        <p className='mt-1 text-light-secondary dark:text-dark-secondary'>
          The caster sealed this content. SealedCast privately checks your
          linked accounts and wallets, and only eligible readers receive its
          decryption key.
        </p>
        <p className='mt-3 text-light-secondary dark:text-dark-secondary'>
          {requirementIsPublic
            ? `Access requirement: ${lockedMessage}`
            : 'The caster chose to keep the access requirements private.'}
        </p>
      </div>
    </div>
  );
}

export function SealedCastContent({ castId }: { castId: string }): JSX.Element {
  const { user } = useAuth();
  const { data: metadata } = useSWR<SealedCastPublicMetadata>(
    `/api/sealed-casts/${castId}/metadata`,
    fetchJSON
  );
  const state = useSealedCastAccess(
    castId,
    user?.id,
    user?.keyPair,
    user?.neynarSignerUuid
  );

  if (state.status === 'unlocked') {
    return (
      <div className='override-nav my-2 rounded-2xl border border-main-accent/30 bg-main-accent/5 p-4'>
        <div className='mb-2 flex items-center gap-2 text-sm font-bold text-main-accent'>
          <HeroIcon className='h-4 w-4' iconName='LockOpenIcon' />
          Access verified privately
        </div>
        <p className='whitespace-pre-wrap'>{state.plaintext}</p>
      </div>
    );
  }
  if (state.status === 'loading') {
    return (
      <div className='override-nav my-2 animate-pulse rounded-2xl border border-light-border p-4 dark:border-dark-border'>
        Checking private access…
      </div>
    );
  }
  return (
    <div className='override-nav my-2 rounded-2xl border border-light-border p-4 dark:border-dark-border'>
      <div className='flex items-center gap-3'>
        <span className='rounded-full bg-light-primary/10 p-2 dark:bg-dark-primary/10'>
          <HeroIcon className='h-5 w-5' iconName='LockClosedIcon' />
        </span>
        <div>
          <p className='font-bold'>Sealed Cast</p>
          <p className='text-sm text-light-secondary dark:text-dark-secondary'>
            {state.status === 'locked'
              ? 'Protected content'
              : 'Private access check is temporarily unavailable'}
          </p>
        </div>
        <AccessInfo lockedMessage={metadata?.lockedMessage} />
      </div>
    </div>
  );
}
