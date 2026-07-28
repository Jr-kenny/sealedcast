import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export function RouteProgress(): JSX.Element {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const start = (): void => setVisible(true);
    const finish = (): void => setVisible(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', finish);
    router.events.on('routeChangeError', finish);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', finish);
      router.events.off('routeChangeError', finish);
    };
  }, [router.events]);

  return (
    <div
      aria-hidden='true'
      className={`fixed left-0 top-0 z-[1000] h-1 bg-main-accent shadow-[0_0_12px_rgb(var(--main-accent))] transition-all duration-300 ${
        visible ? 'w-3/4 opacity-100' : 'w-full opacity-0'
      }`}
    />
  );
}
