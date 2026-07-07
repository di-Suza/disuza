import { api } from '@/shared/api/api';
import type { NotificationMutationResponse, NotificationsQueryArgs, NotificationsResponse } from '../model/notification.types';

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, NotificationsQueryArgs | void>({
      query: (args) => `/notification/getNotifications?${toQueryString({ page: args?.page || 1, limit: args?.limit || 10 })}`,
      providesTags: ['Notifications'],
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (currentCache, incoming, { arg }) => {
        if (!arg || !arg.page || arg.page === 1) {
          Object.assign(currentCache, incoming);
          return;
        }

        const existingIds = new Set(currentCache.notifications.map((notification) => notification._id));
        const nextNotifications = incoming.notifications.filter((notification) => !existingIds.has(notification._id));

        currentCache.notifications.push(...nextNotifications);
        currentCache.hasMore = incoming.hasMore;
        currentCache.currentPage = incoming.currentPage;
        currentCache.unreadCount = incoming.unreadCount;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.page !== previousArg?.page || currentArg?.limit !== previousArg?.limit,
    }),
    markAllAsRead: builder.mutation<NotificationMutationResponse, void>({
      query: () => ({
        url: '/notification/markAllAsRead',
        method: 'PATCH',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationApi.util.updateQueryData('getNotifications', { page: 1, limit: 10 }, (draft) => {
            draft.unreadCount = 0;
            draft.notifications.forEach((notification) => {
              notification.isRead = true;
            });
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    deleteNotification: builder.mutation<NotificationMutationResponse, string>({
      query: (notificationId) => ({
        url: `/notification/deleteNotification/${notificationId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(notificationId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationApi.util.updateQueryData('getNotifications', { page: 1, limit: 10 }, (draft) => {
            const deletedNotification = draft.notifications.find((notification) => notification._id === notificationId);
            draft.notifications = draft.notifications.filter((notification) => notification._id !== notificationId);
            if (deletedNotification && !deletedNotification.isRead) {
              draft.unreadCount = Math.max(0, draft.unreadCount - 1);
            }
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    deleteAllNotifications: builder.mutation<NotificationMutationResponse, void>({
      query: () => ({
        url: '/notification/deleteAllNotifications',
        method: 'DELETE',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationApi.util.updateQueryData('getNotifications', { page: 1, limit: 10 }, (draft) => {
            draft.notifications = [];
            draft.unreadCount = 0;
            draft.hasMore = false;
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
} = notificationApi;
