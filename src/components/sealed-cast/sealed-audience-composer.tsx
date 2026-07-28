import { HeroIcon } from '@components/ui/hero-icon';
import type {
  SealedAccessPolicy,
  SealedAccessRule,
  SealedPolicyVisibility,
  SealedRuleType
} from '@lib/types/sealed-cast';

type Props = {
  enabled: boolean;
  policyVisibility: SealedPolicyVisibility;
  policy: SealedAccessPolicy;
  onEnabledChange: (enabled: boolean) => void;
  onPolicyVisibilityChange: (value: SealedPolicyVisibility) => void;
  onPolicyChange: (value: SealedAccessPolicy) => void;
};

const RULE_OPTIONS: { value: SealedRuleType; label: string }[] = [
  { value: 'nft-ownership', label: 'Owns an NFT from a collection' },
  { value: 'erc20-balance', label: 'Holds a minimum token balance' },
  { value: 'discord-member', label: 'Member of a Discord server' },
  { value: 'discord-role', label: 'Has a Discord role' },
  { value: 'discord-account-age', label: 'Discord account age' },
  { value: 'farcaster-following', label: 'Follows a Farcaster account' },
  { value: 'farcaster-account-age', label: 'Farcaster account age' },
  { value: 'farcaster-followers', label: 'Minimum Farcaster followers' }
];

function newRule(type: SealedRuleType): SealedAccessRule {
  const id = crypto.randomUUID();
  switch (type) {
    case 'nft-ownership':
      return { id, type, contract: '', minCount: '1' };
    case 'erc20-balance':
      return { id, type, contract: '', minBalance: '1' };
    case 'discord-member':
      return { id, type, guildId: '' };
    case 'discord-role':
      return { id, type, guildId: '', roleId: '' };
    case 'discord-account-age':
    case 'farcaster-account-age':
      return { id, type, minDays: '30' };
    case 'farcaster-following':
      return { id, type, targetFid: '' };
    case 'farcaster-followers':
      return { id, type, minFollowers: '100' };
  }
}

const inputClass =
  'mt-1 w-full rounded-xl border border-light-border bg-transparent p-3 font-normal outline-none focus:border-main-accent dark:border-dark-border';

function RuleFields({
  rule,
  onChange
}: {
  rule: SealedAccessRule;
  onChange: (rule: SealedAccessRule) => void;
}): JSX.Element {
  switch (rule.type) {
    case 'nft-ownership':
      return (
        <div className='grid gap-3 sm:grid-cols-[1fr_130px]'>
          <label className='text-sm font-bold'>
            NFT contract address
            <input
              className={inputClass}
              value={rule.contract}
              onChange={(event) =>
                onChange({ ...rule, contract: event.target.value })
              }
              placeholder='0x…'
            />
          </label>
          <label className='text-sm font-bold'>
            Minimum NFTs
            <input
              className={inputClass}
              inputMode='numeric'
              min='1'
              type='number'
              value={rule.minCount}
              onChange={(event) =>
                onChange({ ...rule, minCount: event.target.value })
              }
            />
          </label>
        </div>
      );
    case 'erc20-balance':
      return (
        <div className='grid gap-3 sm:grid-cols-[1fr_150px]'>
          <label className='text-sm font-bold'>
            Token contract address
            <input
              className={inputClass}
              value={rule.contract}
              onChange={(event) =>
                onChange({ ...rule, contract: event.target.value })
              }
              placeholder='0x…'
            />
          </label>
          <label className='text-sm font-bold'>
            Minimum balance
            <input
              className={inputClass}
              inputMode='decimal'
              min='0'
              type='number'
              value={rule.minBalance}
              onChange={(event) =>
                onChange({ ...rule, minBalance: event.target.value })
              }
            />
          </label>
        </div>
      );
    case 'discord-member':
      return (
        <label className='text-sm font-bold'>
          Discord server ID
          <input
            className={inputClass}
            value={rule.guildId}
            onChange={(event) =>
              onChange({ ...rule, guildId: event.target.value })
            }
            placeholder='Server ID'
          />
        </label>
      );
    case 'discord-role':
      return (
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='text-sm font-bold'>
            Discord server ID
            <input
              className={inputClass}
              value={rule.guildId}
              onChange={(event) =>
                onChange({ ...rule, guildId: event.target.value })
              }
              placeholder='Server ID'
            />
          </label>
          <label className='text-sm font-bold'>
            Discord role ID
            <input
              className={inputClass}
              value={rule.roleId}
              onChange={(event) =>
                onChange({ ...rule, roleId: event.target.value })
              }
              placeholder='Role ID'
            />
          </label>
        </div>
      );
    case 'discord-account-age':
    case 'farcaster-account-age':
      return (
        <label className='block text-sm font-bold'>
          Minimum account age in days
          <input
            className={inputClass}
            inputMode='numeric'
            min='1'
            type='number'
            value={rule.minDays}
            onChange={(event) =>
              onChange({ ...rule, minDays: event.target.value })
            }
          />
        </label>
      );
    case 'farcaster-following':
      return (
        <label className='block text-sm font-bold'>
          Farcaster account FID
          <input
            className={inputClass}
            inputMode='numeric'
            value={rule.targetFid}
            onChange={(event) =>
              onChange({ ...rule, targetFid: event.target.value })
            }
            placeholder='For example, 194'
          />
        </label>
      );
    case 'farcaster-followers':
      return (
        <label className='block text-sm font-bold'>
          Minimum follower count
          <input
            className={inputClass}
            inputMode='numeric'
            min='1'
            type='number'
            value={rule.minFollowers}
            onChange={(event) =>
              onChange({ ...rule, minFollowers: event.target.value })
            }
          />
        </label>
      );
  }
}

export function SealedAudienceComposer({
  enabled,
  policyVisibility,
  policy,
  onEnabledChange,
  onPolicyVisibilityChange,
  onPolicyChange
}: Props): JSX.Element {
  const updateRule = (updated: SealedAccessRule): void =>
    onPolicyChange({
      ...policy,
      rules: policy.rules.map((rule) =>
        rule.id === updated.id ? updated : rule
      )
    });

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
            Choose who qualifies. SealedCast checks every identity and linked
            wallet automatically, while iExec Nox protects the access decision
            and content key.
          </p>
          <div className='rounded-xl bg-light-primary/5 p-3 dark:bg-dark-primary/5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-bold'>Show access requirements</p>
                <p className='mt-1 text-sm text-light-secondary dark:text-dark-secondary'>
                  {policyVisibility === 'public'
                    ? 'Locked readers can see what they need to qualify.'
                    : 'Locked readers only see that this cast is restricted.'}
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
          {policy.rules.length > 1 && (
            <label className='block text-sm font-bold'>
              Reader must satisfy
              <select
                className={inputClass}
                value={policy.mode}
                onChange={(event) =>
                  onPolicyChange({
                    ...policy,
                    mode: event.target.value as SealedAccessPolicy['mode']
                  })
                }
              >
                <option value='all'>All requirements</option>
                <option value='any'>Any one requirement</option>
              </select>
            </label>
          )}
          {policy.rules.map((rule, index) => (
            <article
              className='rounded-xl border border-light-border p-3 dark:border-dark-border'
              key={rule.id}
            >
              <div className='mb-3 flex items-center justify-between gap-3'>
                <p className='text-sm font-bold'>Requirement {index + 1}</p>
                <button
                  className='text-sm text-accent-red'
                  type='button'
                  onClick={() =>
                    onPolicyChange({
                      ...policy,
                      rules: policy.rules.filter((item) => item.id !== rule.id)
                    })
                  }
                >
                  Remove
                </button>
              </div>
              <select
                className={`${inputClass} mb-3 mt-0`}
                value={rule.type}
                onChange={(event) =>
                  updateRule({
                    ...newRule(event.target.value as SealedRuleType),
                    id: rule.id
                  })
                }
              >
                {RULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <RuleFields rule={rule} onChange={updateRule} />
            </article>
          ))}
          <label className='block text-sm font-bold'>
            Add a requirement
            <select
              className={inputClass}
              disabled={policy.rules.length >= 5}
              value=''
              onChange={(event) => {
                if (!event.target.value) return;
                onPolicyChange({
                  ...policy,
                  rules: [
                    ...policy.rules,
                    newRule(event.target.value as SealedRuleType)
                  ]
                });
              }}
            >
              <option value=''>Choose requirement type</option>
              {RULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {policy.rules.length >= 5 && (
              <span className='mt-1 block font-normal text-light-secondary dark:text-dark-secondary'>
                Maximum of five requirements reached
              </span>
            )}
          </label>
        </div>
      )}
    </section>
  );
}
