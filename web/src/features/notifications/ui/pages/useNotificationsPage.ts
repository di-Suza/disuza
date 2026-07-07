import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
} from '@/features/notifications/api/notification.api';
import type { NotificationItem } from '@/features/notifications/model/notification.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const NOTIFICATION_PAGE_SIZE = 10;

export const useNotificationsPage = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [page, setPage] = useState(1);
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useGetNotificationsQuery({ page, limit: NOTIFICATION_PAGE_SIZE });
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification, { isLoading: isDeletingOne }] = useDeleteNotificationMutation();
  const [deleteAllNotifications, { isLoading: isDeletingAll }] = useDeleteAllNotificationsMutation();

  const notifications = useMemo(() => data?.notifications || [], [data?.notifications]);
  const unreadCount = data?.unreadCount || 0;

  useEffect(() => {
    if (unreadCount === 0) return undefined;

    const timeoutId = window.setTimeout(() => {
      markAllAsRead().catch(() => undefined);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [markAllAsRead, unreadCount]);

  const handleNotificationClick = useCallback((notification: NotificationItem) => {
    if (notification.type === 'FOLLOW') {
      navigate(`/profile/${notification.sender._id}`);
      return;
    }

    if (notification.type === 'LIKE' || notification.type === 'COMMENT' || notification.type === 'COMMENT_REPLY') {
      navigate('/home');
      return;
    }

    showError('This notification action will be available when the related module is added.');
  }, [navigate, showError]);

  const handleSenderClick = useCallback((event: MouseEvent, senderId: string) => {
    event.stopPropagation();
    navigate(`/profile/${senderId}`);
  }, [navigate]);

  const handleDeleteNotification = useCallback(async (event: MouseEvent, notificationId: string) => {
    event.stopPropagation();

    try {
      await deleteNotification(notificationId).unwrap();
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'Failed to delete notification'));
    }
  }, [deleteNotification, showError]);

  const handleDeleteAllNotifications = useCallback(async () => {
    try {
      const result = await deleteAllNotifications().unwrap();
      showSuccess(result.message || 'Notifications cleared');
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'Failed to clear notifications'));
    }
  }, [deleteAllNotifications, showError, showSuccess]);

  const handleLoadMore = useCallback(() => {
    if (!data?.hasMore || isFetching) return;
    setPage((currentPage) => currentPage + 1);
  }, [data?.hasMore, isFetching]);

  return {
    error,
    handleDeleteAllNotifications,
    handleDeleteNotification,
    handleLoadMore,
    handleNotificationClick,
    handleSenderClick,
    isDeletingAll,
    isDeletingOne,
    isError,
    isFetching,
    isLoading,
    notifications,
    notificationsData: data,
    refetch,
    unreadCount,
  };
};
