import '@rainbow-me/rainbowkit/styles.css';
import '@styles/globals.scss';

import { AppHead } from '@components/common/app-head';
import { RouteProgress } from '@components/common/route-progress';
import { AuthContextProvider } from '@lib/context/auth-context';
import { ThemeContextProvider } from '@lib/context/theme-context';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import type { AppProps } from 'next/app';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  zora
} from 'wagmi/chains';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const config = getDefaultConfig({
  appName: 'SealedCast',
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'sealedcast-local-development',
  chains: [sepolia, arbitrum, base, mainnet, optimism, polygon, zora]
});

// const wagmiConfig = createConfig({
//   autoConnect: true,
//   connectors,
//   publicClient
// });

export default function App({
  Component,
  pageProps
}: AppPropsWithLayout): ReactNode {
  const getLayout = Component.getLayout ?? ((page): ReactNode => page);

  return (
    <>
      <AppHead />
      <RouteProgress />
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <AuthContextProvider>
              <ThemeContextProvider>
                {getLayout(<Component {...pageProps} />)}
              </ThemeContextProvider>
            </AuthContextProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}
