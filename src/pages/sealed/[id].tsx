import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { SEO } from '@components/common/seo';
import type { SealedCastPublicMetadata } from '@lib/types/sealed-cast';

type Props = {
  metadata: SealedCastPublicMetadata;
};

export default function SealedCastPage({ metadata }: Props): JSX.Element {
  return (
    <main className='flex min-h-screen items-center justify-center bg-black px-6 text-white'>
      <SEO
        title='Sealed Cast / SealedCast'
        description={metadata.lockedMessage}
        image='/logo512.png'
      />
      <section className='w-full max-w-xl rounded-3xl border border-gray-700 bg-gray-900 p-8 text-center shadow-2xl'>
        <img
          src='/logo192.png'
          alt='SealedCast lock'
          className='mx-auto h-20 w-20 rounded-2xl'
        />
        <p className='text-twitter-blue mt-6 text-sm font-bold uppercase tracking-[0.24em]'>
          Sealed Cast #{metadata.id}
        </p>
        <h1 className='mt-3 text-3xl font-bold'>This cast is protected</h1>
        <p className='mt-3 text-lg text-gray-400'>{metadata.lockedMessage}</p>
        <Link
          href={`/?sealed=${metadata.id}`}
          className='bg-twitter-blue hover:bg-twitter-blue/90 mt-8 inline-flex rounded-full px-7 py-3 font-bold text-white'
        >
          Open in SealedCast
        </Link>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params
}) => {
  const id = params?.id;
  if (typeof id !== 'string' || !/^\d+$/.test(id)) return { notFound: true };

  const apiOrigin = process.env.AWS_API_ORIGIN?.replace(/\/$/, '');
  if (!apiOrigin) return { notFound: true };
  const response = await fetch(`${apiOrigin}/api/sealed-casts/${id}/metadata`);
  if (!response.ok) return { notFound: true };
  const metadata = (await response.json()) as SealedCastPublicMetadata;
  return { props: { metadata } };
};
