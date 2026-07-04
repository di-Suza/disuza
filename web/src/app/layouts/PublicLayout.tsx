import { Navigate, Outlet } from 'react-router-dom';

import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import { useAppSelector } from '../store/hooks';

const PublicLayout = () => {
  const { status, user } = useAppSelector((state) => state.auth);

  if (status === 'idle' || status === 'loading') {
    return <FullPageLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicLayout;
