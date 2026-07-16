import { Bell, Earth, Home, Menu, SendHorizonal, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useGetNotificationsQuery } from '@/features/notifications/api/notification.api';
import logo from '@/shared/assets/images/logo.png';
import useUnreadMessagesCount from '@/shared/hooks/useUnreadMessagesCount';
import './Sidebar.css';

const sidebarItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/home' },
  { id: 'search', label: 'Explore', icon: Earth, path: '/search' },
  { id: 'messages', label: 'Messages', icon: SendHorizonal, path: '/messages' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { id: 'dashboard', label: 'Dashboard', icon: User, path: '/dashboard' },
] as const;

const Sidebar = () => {
  const { pathname } = useLocation();
  const [isExpanded, setExpanded] = useState(false);
  const { data: notificationsData } = useGetNotificationsQuery({ page: 1, limit: 1 });
  const notificationCount = notificationsData?.unreadCount ?? 0;
  const messageCount = useUnreadMessagesCount();

  const isItemActive = (itemPath: string) => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  return (
    <>
      {isExpanded && <button type="button" className="app-sidebar__backdrop" onClick={() => setExpanded(false)} aria-label="Close sidebar" />}

      <aside className={isExpanded ? 'app-sidebar is-expanded' : 'app-sidebar'} aria-label="Primary navigation">
        <header className="app-sidebar__header">
          <button
            type="button"
            className="app-sidebar__toggle"
            onClick={() => setExpanded((current) => !current)}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isExpanded}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link to="/home" className="app-sidebar__brand" aria-label="DevLoopFeed home">
            <img src={logo} alt="" />
          </Link>
        </header>

        <nav className="app-sidebar__panel" aria-label="Main navigation">
          <div className="app-sidebar__items">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.path);
              const badgeCount = item.id === 'messages' ? messageCount : item.id === 'notifications' ? notificationCount : 0;

              return (
                <Link key={item.id} title={item.label} to={item.path} className={isActive ? 'app-sidebar__link is-active' : 'app-sidebar__link'}>
                  <span className="app-sidebar__icon-wrap">
                    <Icon size={24} aria-hidden="true" />
                    {badgeCount > 0 && <small>{badgeCount > 99 ? '99+' : badgeCount}</small>}
                  </span>
                  <span className="app-sidebar__label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
