import { HeroIcon } from '@components/ui/hero-icon';
import { useAuth } from '@lib/context/auth-context';
import { useSealedCastAccess } from '@lib/hooks/useSealedCastAccess';

export function SealedCastContent({ castId }: { castId: string }): JSX.Element {
  const { user } = useAuth();
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
            {state.status === 'locked' ? state.hint : state.message}
          </p>
        </div>
      </div>
    </div>
  );
}
