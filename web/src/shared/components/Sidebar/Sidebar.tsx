import { Bell, Earth, Home, SendHorizonal, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useGetNotificationsQuery } from '@/features/notifications/api/notification.api';

const sidebarItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/home' },
  { id: 'search', label: 'Explore', icon: Earth, path: '/search' },
  { id: 'messages', label: 'Messages', icon: SendHorizonal, path: '/messages' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { id: 'dashboard', label: 'Dashboard', icon: User, path: '/dashboard' },
] as const;

const Sidebar = () => {
  const { pathname } = useLocation();
  const { data: notificationsData } = useGetNotificationsQuery({ page: 1, limit: 1 });
  const notificationCount = notificationsData?.unreadCount ?? 0;

  const isItemActive = (itemPath: string) => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

  return (
    <>
      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="app-sidebar__items">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.path);
            const badgeCount = item.id === 'notifications' ? notificationCount : 0;

            return (
              <Link key={item.id} title={item.label} to={item.path} className={isActive ? 'app-sidebar__link is-active' : 'app-sidebar__link'}>
                <span className="app-sidebar__icon-wrap">
                  <Icon size={24} aria-hidden="true" />
                  {badgeCount > 0 && <small>{badgeCount > 99 ? '99+' : badgeCount}</small>}
                </span>
                <span className="visually-hidden">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      <nav className="app-bottom-nav" aria-label="Primary navigation">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);
          const badgeCount = item.id === 'notifications' ? notificationCount : 0;

          return (
            <Link key={item.id} to={item.path} className={isActive ? 'app-bottom-nav__link is-active' : 'app-bottom-nav__link'} aria-label={item.label}>
              <span className="app-sidebar__icon-wrap">
                <Icon size={23} aria-hidden="true" />
                {badgeCount > 0 && <small>{badgeCount > 99 ? '99+' : badgeCount}</small>}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;