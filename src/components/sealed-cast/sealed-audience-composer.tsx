import { HeroIcon } from '@components/ui/hero-icon';
import type { SealedPolicyVisibility } from '@lib/types/sealed-cast';
import { getAddress, isAddress, type Address } from 'viem';

type Props = {
  enabled: boolean;
  publicHint: string;
  policyVisibility: SealedPolicyVisibility;
  audienceText: string;
  onEnabledChange: (enabled: boolean) => void;
  onPublicHintChange: (value: string) => void;
  onPolicyVisibilityChange: (value: SealedPolicyVisibility) => void;
  onAudienceTextChange: (value: string) => void;
};

export function parseAudienceWallets(value: string): Address[] {
  const wallets = value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (wallets.length > 5) throw new Error('Use at most five audience wallets');
  if (wallets.some((wallet) => !isAddress(wallet))) {
    throw new Error('Every audience entry must be an Ethereum address');
  }
  return [...new Set(wallets.map((wallet) => getAddress(wallet)))];
}

export function SealedAudienceComposer({
  enabled,
  publicHint,
  policyVisibility,
  audienceText,
  onEnabledChange,
  onPublicHintChange,
  onPolicyVisibilityChange,
  onAudienceTextChange
}: Props): JSX.Element {
  return (
    <section className='override-nav rounded-2xl border border-light-border p-3 dark:border-dark-border'>
      <button
        className='flex w-full items-center justify-between gap-3 text-left'
        type='button'
        aria-expanded={enabled}
        onClick={() => onEnabledChange(!enabled)}
      >
        <span className='flex items-center gap-2 font-bold'>
          <HeroIcon
            className='h-5 w-5 text-main-accent'
            iconName='ShieldCheckIcon'
          />
          Seal this cast
        </span>
        <span className='text-sm text-light-secondary dark:text-dark-secondary'>
          {enabled ? 'On' : 'Off'}
        </span>
      </button>
      {enabled && (
        <div className='mt-3 space-y-3'>
          <p className='text-sm text-light-secondary dark:text-dark-secondary'>
            The plaintext, audience addresses, and access decision are protected
            by iExec Nox.
          </p>
          <div className='rounded-xl bg-light-primary/5 p-3 dark:bg-dark-primary/5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-bold'>Show access requirements</p>
                <p className='mt-1 text-sm text-light-secondary dark:text-dark-secondary'>
                  {policyVisibility === 'public'
                    ? 'People who cannot unlock the cast will see your requirement.'
                    : 'The requirement stays private. Locked viewers only see that access is restricted.'}
                </p>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={policyVisibility === 'public'}
                className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  policyVisibility === 'public'
                    ? 'bg-main-accent'
                    : 'bg-light-secondary/40 dark:bg-dark-secondary/40'
                }`}
                onClick={() =>
                  onPolicyVisibilityChange(
                    policyVisibility === 'public' ? 'hidden' : 'public'
                  )
                }
              >
                <span
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    policyVisibility === 'public'
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {policyVisibility === 'public' && (
            <label className='block text-sm font-bold'>
              Public access requirement
              <input
                className='mt-1 w-full rounded-xl border border-light-border bg-transparent p-3 font-normal outline-none focus:border-main-accent dark:border-dark-border'
                maxLength={120}
                value={publicHint}
                onChange={(event) => onPublicHintChange(event.target.value)}
                placeholder='Members of the selected community'
              />
            </label>
          )}
          <label className='block text-sm font-bold'>
            Qualified wallets · up to five
            <textarea
              className='mt-1 min-h-[84px] w-full rounded-xl border border-light-border bg-transparent p-3 font-mono text-sm font-normal outline-none focus:border-main-accent dark:border-dark-border'
              value={audienceText}
              onChange={(event) => onAudienceTextChange(event.target.value)}
              placeholder='0x… one per line'
            />
          </label>
        </div>
      )}
    </section>
  );
}
