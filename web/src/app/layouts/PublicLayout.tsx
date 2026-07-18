import { Navigate, Outlet, useLocation } from 'react-router-dom';

import DocumentTitleManager from '@/shared/components/DocumentTitleManager/DocumentTitleManager';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import { useAppSelector } from '../store/hooks';

const PublicLayout = () => {
  const location = useLocation();
  const { status, user } = useAppSelector((state) => state.auth);

  if (status === 'idle' || status === 'loading') {
    return <FullPageLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <ErrorBoundary variant="inline" title="Document title updates paused." showReload={false}>
        <DocumentTitleManager />
      </ErrorBoundary>
      <ErrorBoundary resetKeys={[location.pathname, location.search]} title="This public page could not be rendered.">
        <Outlet />
      </ErrorBoundary>
    </>
  );
};

export default PublicLayout;
