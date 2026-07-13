import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
} from '@/features/notifications/api/notification.api';
import { useAcceptCollabRequestMutation } from '@/features/collab/api/collab.api';
import type { NotificationItem } from '@/features/notifications/model/notification.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const NOTIFICATION_PAGE_SIZE = 10;

const getRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
);

const getNotificationPostId = (notification: NotificationItem): string | null => {
  const content = getRecord(notification.contentId);
  if (!content) return null;

  if (typeof content._id === 'string' && notification.onModel === 'Post') return content._id;

  const post = getRecord(content.post);
  if (typeof post?._id === 'string') return post._id;

  return null;
};

export const useNotificationsPage = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [page, setPage] = useState(1);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
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
  const [acceptCollabRequest] = useAcceptCollabRequestMutation();

  const notifications = useMemo(() => data?.notifications || [], [data?.notifications]);
  const unreadCount = data?.unreadCount || 0;

  useEffect(() => {
    if (unreadCount === 0) return undefined;

    const timeoutId = window.setTimeout(() => {
      markAllAsRead().catch(() => undefined);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [markAllAsRead, unreadCount]);

  const handleNotificationClick = useCallback(async (notification: NotificationItem) => {
    if (notification.type === 'FOLLOW') {
      navigate(`/profile/${notification.sender._id}`);
      return;
    }

    if (notification.type === 'LIKE' || notification.type === 'COMMENT' || notification.type === 'COMMENT_REPLY') {
      const postId = getNotificationPostId(notification);
      navigate(postId ? `/post/${postId}` : '/home');
      return;
    }

    if (notification.type === 'COLLAB_ACCEPTED') {
      const content = getRecord(notification.contentId);
      const roomId = typeof content?._id === 'string' ? content._id : null;
      navigate(roomId ? `/collab/${roomId}` : '/messages');
      return;
    }

    if (notification.type === 'COLLAB_REQUEST') {
      const content = getRecord(notification.contentId);
      const conversationId = typeof content?.conversationId === 'string'
        ? content.conversationId
        : typeof (content?.conversationId as { _id?: string } | undefined)?._id === 'string'
          ? (content?.conversationId as { _id?: string })._id
          : null;

      if (!conversationId) {
        navigate('/messages');
        return;
      }

      try {
        const response = await acceptCollabRequest(conversationId).unwrap();
        const roomId = response?.data?._id;
        navigate(roomId ? `/collab/${roomId}` : '/messages');
      } catch (apiError) {
        showError(getErrorMessage(apiError, 'Failed to open collab room'));
      }
      return;
    }

    showError('This notification action will be available when the related module is added.');
  }, [acceptCollabRequest, navigate, showError]);

  const handleSenderClick = useCallback((event: MouseEvent, senderId: string) => {
    event.stopPropagation();
    navigate(`/profile/${senderId}`);
  }, [navigate]);

  const handleAcceptCollabFromNotification = useCallback(async (event: MouseEvent, notification: NotificationItem) => {
    event.stopPropagation();

    const content = getRecord(notification.contentId);
    const conversationId = typeof content?.conversationId === 'string'
      ? content.conversationId
      : typeof (content?.conversationId as { _id?: string } | undefined)?._id === 'string'
        ? (content?.conversationId as { _id?: string })._id
        : null;

    if (!conversationId) {
      showError('Collab request is expired or invalid');
      return;
    }

    try {
      setActiveActionId(notification._id);
      const response = await acceptCollabRequest(conversationId).unwrap();
      const roomId = response?.data?._id;

      if (!roomId) {
        showError('Room not found after accepting request');
        return;
      }

      navigate(`/collab/${roomId}`);
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'Something went wrong while accepting collab request'));
    } finally {
      setActiveActionId(null);
    }
  }, [acceptCollabRequest, navigate, showError]);

  const handleEnterRoomFromNotification = useCallback(async (event: MouseEvent, notification: NotificationItem) => {
    event.stopPropagation();

    const content = getRecord(notification.contentId);
    const roomId = typeof content?._id === 'string' ? content._id : null;

    if (!roomId) {
      showError('Collab room is not available');
      return;
    }

    try {
      setActiveActionId(notification._id);
      await deleteNotification(notification._id).unwrap();
      navigate(`/collab/${roomId}`);
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'Failed to open collab room'));
    } finally {
      setActiveActionId(null);
    }
  }, [deleteNotification, navigate, showError]);

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
    activeActionId,
    error,
    handleAcceptCollabFromNotification,
    handleDeleteAllNotifications,
    handleDeleteNotification,
    handleEnterRoomFromNotification,
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
