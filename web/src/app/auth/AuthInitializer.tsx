import { type ReactNode } from 'react';

import { useGetMeQuery } from '@/features/auth/api/auth.api';
import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import { useAppSelector } from '../store/hooks';

type AuthInitializerProps = {
  children: ReactNode;
};

const AuthInitializer = ({ children }: AuthInitializerProps) => {
  const { isLoggedOut, status, user } = useAppSelector((state) => state.auth);
  const shouldSkipMe = Boolean(user) || isLoggedOut;
  const { isFetching, isLoading } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: shouldSkipMe,
  });

  if (!shouldSkipMe && (status === 'idle' || status === 'loading' || isLoading || isFetching)) {
    return <FullPageLoader />;
  }

  return children;
};

export default AuthInitializer;
