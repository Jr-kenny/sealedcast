import { useRouter } from 'next/router';
import Head from 'next/head';
import { siteURL } from '@lib/env';

type MainLayoutProps = {
  title: string;
  image?: string;
  description?: string;
};

export function SEO({
  title,
  image,
  description
}: MainLayoutProps): JSX.Element {
  const { asPath } = useRouter();
  const absoluteImage = image
    ? new URL(image, siteURL || 'http://localhost:3000').toString()
    : undefined;
  const canonicalUrl = `${siteURL}${asPath === '/' ? '' : asPath}`;

  return (
    <Head>
      <title>{title}</title>
      <meta property='og:title' content={title} />
      <meta property='og:type' content='website' />
      {description && <meta name='description' content={description} />}
      {description && <meta property='og:description' content={description} />}
      {absoluteImage && <meta property='og:image' content={absoluteImage} />}
      <meta property='og:url' content={canonicalUrl} />
      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:title' content={title} />
      {description && <meta name='twitter:description' content={description} />}
      {absoluteImage && <meta name='twitter:image' content={absoluteImage} />}
    </Head>
  );
}
