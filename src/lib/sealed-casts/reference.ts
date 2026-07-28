import type { ExternalEmbed } from '@lib/types/tweet';
import type { SealedCastReference } from '@lib/types/sealed-cast';

const SEALED_PATH = '/sealed/';

export function sealedCastReferenceUrl(id: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('The public SealedCast URL is not configured');
  return `${baseUrl}${SEALED_PATH}${id}`;
}

export function resolveSealedCastReference(
  embeds: ExternalEmbed[]
): SealedCastReference | null {
  for (const embed of embeds) {
    try {
      const url = new URL(embed.url);
      const match = url.pathname.match(/^\/sealed\/(\d+)$/);
      if (match) return { id: match[1] };
    } catch {
      continue;
    }
  }
  return null;
}
