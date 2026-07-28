import { notificationApi } from '@/features/notifications/api/notification.api';
import { getUnreadNotificationsCount } from './unreadCount.helpers';

const useUnreadNotificationsCount = () => {
  const { unreadCount } = notificationApi.endpoints.getUnreadNotificationsCount.useQueryState(
    undefined,
    {
      selectFromResult: ({ data }) => ({
        unreadCount: getUnreadNotificationsCount(data?.unreadCount),
      }),
    },
  );

  return unreadCount;
};

export { useUnreadNotificationsCount };
