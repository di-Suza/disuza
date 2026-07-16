import { Bell, Earth, Home, LogOut, Menu, SendHorizonal, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useLogoutMutation } from '@/features/auth/api/auth.api';
import { useGetNotificationsQuery } from '@/features/notifications/api/notification.api';
import useUnreadMessagesCount from '@/shared/hooks/useUnreadMessagesCount';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './Sidebar.css';

const sidebarItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/home' },
  { id: 'search', label: 'Explore', icon: Earth, path: '/search' },
  { id: 'messages', label: 'Messages', icon: SendHorizonal, path: '/messages' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { id: 'profile', label: 'Profile', icon: UserRound, path: '/dashboard' },
] as const;

const Sidebar = () => {
  const { pathname, search } = useLocation();
  const [isExpanded, setExpanded] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const { data: notificationsData } = useGetNotificationsQuery({ page: 1, limit: 1 });
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { showError, showSuccess } = useToast();
  const notificationCount = notificationsData?.unreadCount ?? 0;
  const messageCount = useUnreadMessagesCount();
  const activeFeedType = new URLSearchParams(search).get('type') === 'following' ? 'following' : 'all';
  const profilePictureUrl = typeof user?.profilePicture?.url === 'string' ? user.profilePicture.url : '';

  const isItemActive = (itemPath: string) => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

  const handleLogout = async () => {
    try {
      const result = await logout().unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

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
        </header>

        <div className="app-sidebar__feed-switcher" aria-label="Feed filter">
          <Link
            to="/home?type=all"
            className={activeFeedType === 'all' ? 'is-active' : ''}
            onClick={() => setExpanded(false)}
          >
            All
          </Link>
          <Link
            to="/home?type=following"
            className={activeFeedType === 'following' ? 'is-active' : ''}
            onClick={() => setExpanded(false)}
          >
            Following
          </Link>
        </div>

        <nav className="app-sidebar__panel" aria-label="Main navigation">
          <div className="app-sidebar__items">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.path);
              const badgeCount = item.id === 'messages' ? messageCount : item.id === 'notifications' ? notificationCount : 0;
              const isProfileItem = item.id === 'profile';

              return (
                <Link key={item.id} title={item.label} to={item.path} className={isActive ? 'app-sidebar__link is-active' : 'app-sidebar__link'}>
                  <span className="app-sidebar__icon-wrap">
                    {isProfileItem && profilePictureUrl ? (
                      <img className="app-sidebar__profile-avatar" src={profilePictureUrl} alt="" />
                    ) : (
                      <Icon size={24} aria-hidden="true" />
                    )}
                    {badgeCount > 0 && <small>{badgeCount > 99 ? '99+' : badgeCount}</small>}
                  </span>
                  <span className="app-sidebar__label">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="app-sidebar__footer">
            <button type="button" className="app-sidebar__link app-sidebar__logout" onClick={handleLogout} disabled={isLoggingOut}>
              <span className="app-sidebar__icon-wrap"><LogOut size={22} aria-hidden="true" /></span>
              <span className="app-sidebar__label">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
