import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import useUnreadMessagesCount from '@/shared/hooks/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/shared/hooks/useUnreadNotificationsCount';

const APP_NAME = 'Disuza';

const getBaseTitle = (pathname: string) => {
  if (pathname.startsWith('/home')) return 'Home';
  if (pathname.startsWith('/search')) return 'Explore';
  if (pathname.startsWith('/messages')) return 'Message';
  if (pathname.startsWith('/notifications')) return 'Notification';
  if (pathname.startsWith('/collab')) return 'Collaboration';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/post')) return 'Post';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/auth/signin')) return 'Sign In';
  if (pathname.startsWith('/auth/signup')) return 'Sign Up';
  if (pathname === '/') return APP_NAME;
  return APP_NAME;
};

const DocumentTitleManager = () => {
  const { pathname } = useLocation();
  const unreadMessagesCount = useUnreadMessagesCount();
  const unreadNotificationsCount = useUnreadNotificationsCount();

  useEffect(() => {
    const baseTitle = getBaseTitle(pathname);
    const count = pathname.startsWith('/messages')
      ? unreadMessagesCount
      : pathname.startsWith('/notifications')
        ? unreadNotificationsCount
        : 0;
    const countPrefix = count > 0 ? `(${count > 99 ? '99+' : count}) ` : '';

    document.title = baseTitle === APP_NAME ? APP_NAME : `${countPrefix}${baseTitle} | ${APP_NAME}`;
  }, [pathname, unreadMessagesCount, unreadNotificationsCount]);

  return null;
};

export default DocumentTitleManager;
