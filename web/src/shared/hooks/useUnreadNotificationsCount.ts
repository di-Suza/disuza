import { notificationApi } from '@/features/notifications/api/notification.api';

const useUnreadNotificationsCount = () => {
  const { unreadCount } = notificationApi.endpoints.getNotifications.useQueryState(
    { page: 1, limit: 10 },
    {
      selectFromResult: ({ data }) => ({
        unreadCount: data?.unreadCount || 0,
      }),
    },
  );

  return unreadCount;
};

export { useUnreadNotificationsCount };
