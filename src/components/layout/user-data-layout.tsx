import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { UserHeader } from '@components/user/user-header';
import { UserContextProvider } from '@lib/context/user-context';
import { useAuth } from '@lib/context/auth-context';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetchJSON } from '../../lib/fetch';
import { UserFull, UserFullResponse, UserResponse } from '../../lib/types/user';
import type { LayoutProps } from './common-layout';

export function UserDataLayout({ children }: LayoutProps): JSX.Element {
  const {
    query: { id },
    back
  } = useRouter();
  const { user: signedInUser } = useAuth();
  const ownProfile =
    typeof id === 'string' &&
    (id === signedInUser?.id || id === signedInUser?.username)
      ? signedInUser
      : undefined;

  const { data: user, isValidating: loading } = useSWR(
    id
      ? `/api/user/${id}${
          signedInUser?.id ? `?viewer_fid=${signedInUser.id}` : ''
        }`
      : null,
    async (url) => (await fetchJSON<UserFullResponse>(url)).result,
    {
      fallbackData: ownProfile,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000
    }
  );

  return (
    <UserContextProvider
      value={{ user: (user as UserFull) || null, loading: !user && loading }}
    >
      {!user && !loading && <SEO title='User not found / SealedCast' />}
      <MainContainer>
        <MainHeader useActionButton action={back}>
          <UserHeader />
        </MainHeader>
        {children}
      </MainContainer>
    </UserContextProvider>
  );
}
