import { CustomIcon } from '@components/ui/custom-icon';
import { SEO } from './seo';

export function Placeholder(): JSX.Element {
  return (
    <main className='flex min-h-screen items-center justify-center'>
      <SEO
        title='SealedCast'
        description='Privacy-enhanced Farcaster client powered by iExec Nox.'
        image='/banner.png'
      />
      <i>
        <CustomIcon
          className='h-20 w-20 text-[#1DA1F2]'
          iconName='SealedCastIcon'
        />
      </i>
    </main>
  );
}
