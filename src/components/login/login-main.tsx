import { CustomIcon } from '@components/ui/custom-icon';
import Link from 'next/link';
import { SignInWithNeynar } from './sign-in-with-neynar';

export function LoginMain(): JSX.Element {
  return (
    <main className='grid min-h-screen lg:grid-cols-[1fr,45vw]'>
      <div className='relative hidden overflow-hidden bg-[#061725] p-14 text-white lg:flex lg:flex-col lg:justify-between'>
        <div className='absolute -left-32 top-16 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl' />
        <div className='absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-400/25 blur-3xl' />
        <div className='relative flex items-center gap-3 text-xl font-bold tracking-tight'>
          <CustomIcon
            className='h-9 w-9 text-sky-300'
            iconName='SealedCastIcon'
          />
          SealedCast
        </div>
        <div className='relative max-w-2xl space-y-6'>
          <p className='text-6xl font-bold leading-[1.02] tracking-tight'>
            Share openly. Reveal selectively.
          </p>
          <p className='max-w-xl text-xl leading-8 text-sky-50/70'>
            A privacy layer for Farcaster, with confidential access rules
            enforced by iExec Nox.
          </p>
        </div>
        <p className='relative text-sm text-sky-50/50'>
          Plaintext and private requirements stay sealed.
        </p>
      </div>
      <div className='flex flex-col items-center justify-between gap-6 p-8 lg:items-start lg:justify-center'>
        <i className='mb-0 self-center lg:mb-10 lg:self-auto'>
          <CustomIcon
            className='-mt-4 h-8 w-8 text-accent-blue lg:h-12 lg:w-12 dark:lg:text-twitter-icon'
            iconName='SealedCastIcon'
          />
        </i>
        <div className='flex max-w-xs flex-col gap-4 font-twitter-chirp-extended lg:max-w-none lg:gap-16'>
          <h1 className='text-3xl font-bold leading-tight lg:text-6xl'>
            Your Farcaster feed, with privacy built in.
          </h1>
          <h2 className='hidden text-xl lg:block lg:text-3xl'>
            Enter SealedCast.
          </h2>
        </div>
        <div className='flex max-w-xs flex-col gap-6 [&_button]:py-2'>
          <div className='grid gap-3 font-bold'>
            <SignInWithNeynar />
            <p className='text-center text-xs leading-5 text-light-secondary dark:text-dark-secondary'>
              First connection takes about a minute. Farcaster will ask you to
              sign in, grant access, and approve publishing.
            </p>
            <Link
              href='/home'
              className='custom-button main-tab flex justify-center gap-2 border border-white bg-black font-bold text-white
             transition hover:bg-opacity-90 focus-visible:bg-opacity-90 active:bg-opacity-80
             dark:hover:brightness-125 dark:focus-visible:brightness-125 dark:active:brightness-150'
            >
              Continue without signing in
            </Link>
            <p
              className='inner:custom-underline inner:custom-underline text-center text-xs
                         text-light-secondary inner:text-accent-blue dark:text-dark-secondary'
            >
              You authorize your own Farcaster account. SealedCast never asks
              for your recovery phrase.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
