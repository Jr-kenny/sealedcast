import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@lib/context/auth-context';
import type { NeynarSignInResult } from '@lib/types/neynar';

const NEYNAR_LOGIN_URL = 'https://app.neynar.com/login';

export function SignInWithNeynar(): JSX.Element {
  const { handleNeynarAuth } = useAuth();
  const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;
  const popupRef = useRef<Window | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    function receiveSignIn(event: MessageEvent<NeynarSignInResult>): void {
      if (
        event.origin !== new URL(NEYNAR_LOGIN_URL).origin ||
        !event.data?.is_authenticated ||
        !event.data.fid ||
        !event.data.signer_uuid
      ) {
        return;
      }
      popupRef.current?.close();
      popupRef.current = null;
      setConnecting(false);
      void handleNeynarAuth({
        fid: event.data.fid.toString(),
        signerUuid: event.data.signer_uuid
      }).catch((reason) => {
        toast.error(
          reason instanceof Error ? reason.message : 'Farcaster sign-in failed'
        );
      });
    }
    window.addEventListener('message', receiveSignIn);
    return () => window.removeEventListener('message', receiveSignIn);
  }, [handleNeynarAuth]);

  function openSignIn(): void {
    if (!clientId) return;
    const url = new URL(NEYNAR_LOGIN_URL);
    url.searchParams.set('client_id', clientId);
    const width = Math.min(860, window.screen.availWidth - 32);
    const height = Math.min(900, window.screen.availHeight - 32);
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    popupRef.current = window.open(
      url.toString(),
      'sealedcast-farcaster-sign-in',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!popupRef.current) {
      toast.error('Allow popups for SealedCast to connect Farcaster');
      return;
    }
    setConnecting(true);
    const closed = window.setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        setConnecting(false);
        window.clearInterval(closed);
      }
    }, 500);
  }

  if (!clientId) return <></>;

  return (
    <button
      type='button'
      className='flex h-11 w-full items-center justify-center gap-3 rounded-full bg-white px-5 text-[15px] font-bold text-black transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70'
      onClick={openSignIn}
      disabled={connecting}
    >
      <span className='flex h-7 w-7 items-center justify-center rounded-md bg-[#855DCD] text-white'>
        <svg viewBox='0 0 225 225' className='h-6 w-6' aria-hidden='true'>
          <path
            fill='currentColor'
            d='M58 35h109v155h-16v-71h-.16C149.08 99.38 132.58 84 112.5 84S75.93 99.38 74.16 119H74v71H58V35Z'
          />
          <path
            fill='currentColor'
            d='m29 57 6.5 22H41v89a5 5 0 0 0-5 5v6h-1a5 5 0 0 0-5 5v6h56v-6a5 5 0 0 0-5-5h-1v-6a5 5 0 0 0-5-5h-6V57H29Zm123 111a5 5 0 0 0-5 5v6h-1a5 5 0 0 0-5 5v6h56v-6a5 5 0 0 0-5-5h-1v-6a5 5 0 0 0-5-5V79h5.5l6.5-22h-40v111h-6Z'
          />
        </svg>
      </span>
      {connecting ? 'Finish in the Farcaster window' : 'Connect Farcaster'}
    </button>
  );
}
