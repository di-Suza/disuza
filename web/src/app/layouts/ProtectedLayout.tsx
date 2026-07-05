import { Navigate, Outlet, useLocation } from 'react-router-dom';

import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import { useAppSelector } from '../store/hooks';

const ProtectedLayout = () => {
  const location = useLocation();
  const { status, user } = useAppSelector((state) => state.auth);

  if (status === 'idle' || status === 'loading') {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedLayout;
