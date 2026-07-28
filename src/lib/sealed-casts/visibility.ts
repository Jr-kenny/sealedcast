import type { SealedPolicyVisibility } from '@lib/types/sealed-cast';

export const PRIVATE_REQUIREMENT_MESSAGE = 'Access requirements are private';

export function lockedMessageForPolicy(
  visibility: SealedPolicyVisibility | undefined,
  publicHint: string
): string {
  return visibility === 'public' && publicHint
    ? publicHint
    : PRIVATE_REQUIREMENT_MESSAGE;
}
