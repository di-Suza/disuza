import { notificationApi } from '@/features/notifications/api/notification.api';
import { getUnreadNotificationsCount } from './unreadCount.helpers';

const useUnreadNotificationsCount = () => {
  const { unreadCount } = notificationApi.endpoints.getNotifications.useQueryState(
    { page: 1, limit: 10 },
    {
      selectFromResult: ({ data }) => ({
        unreadCount: getUnreadNotificationsCount(data?.unreadCount),
      }),
    },
  );

  return unreadCount;
};

export { useUnreadNotificationsCount };
