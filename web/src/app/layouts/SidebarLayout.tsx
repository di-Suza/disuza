import { Outlet } from 'react-router-dom';

import Sidebar from '@/shared/components/Sidebar/Sidebar';

const SidebarLayout = () => (
  <div className="sidebar-layout">
    <Sidebar />
    <main className="sidebar-layout__content">
      <Outlet />
    </main>
  </div>
);

export default SidebarLayout;