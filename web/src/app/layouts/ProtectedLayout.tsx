import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useGetConversationsQuery } from '@/features/messages/api/chat.api';
import { useGetNotificationsQuery } from '@/features/notifications/api/notification.api';
import DocumentTitleManager from '@/shared/components/DocumentTitleManager/DocumentTitleManager';
import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import MessageObserver from '@/shared/utils/MessageObserver';
import { useAppSelector } from '../store/hooks';

const ProtectedLayout = () => {
  const location = useLocation();
  const { status, user } = useAppSelector((state) => state.auth);
  const userId = user?._id;

  useGetConversationsQuery(undefined, { skip: !userId });
  useGetNotificationsQuery({ page: 1, limit: 10 }, { skip: !userId });

  if (status === 'idle' || status === 'loading') {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace state={{ from: location }} />;
  }

  return (
    <>
      <DocumentTitleManager />
      <MessageObserver />
      <Outlet />
    </>
  );
};

export default ProtectedLayout;
