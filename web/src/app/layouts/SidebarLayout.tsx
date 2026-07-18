import { Outlet, useLocation } from 'react-router-dom';

import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import Sidebar from '@/shared/components/Sidebar/Sidebar';
import './SidebarLayout.css';

const SidebarLayout = () => {
  const location = useLocation();

  return (
    <div className="sidebar-layout">
      <ErrorBoundary variant="section" title="Navigation could not be rendered." showReload={false}>
        <Sidebar />
      </ErrorBoundary>
      <main className="sidebar-layout__content">
        <ErrorBoundary resetKeys={[location.pathname, location.search]} title="This page could not be rendered.">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default SidebarLayout;
