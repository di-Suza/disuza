import { Bell, Check, Loader2, LogIn, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { memo, type MouseEvent } from 'react';

import {
  getNotificationIcon,
  getNotificationText,
  getNotificationThumbnailUrl,
} from '@/features/notifications/model/notification.helpers';
import type { NotificationItem } from '@/features/notifications/model/notification.types';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import Image from '@/shared/components/Image/Image';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useNotificationsPage } from './useNotificationsPage';
import './NotificationsPage.css';
import '@/app/layouts/ProductShell.css';

const getAvatarUrl = (notification: NotificationItem) => {
  const url = notification.sender?.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : null;
};

const formatNotificationDate = (value?: string) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

type NotificationCardProps = {
  isActionActive: boolean;
  isDeletingOne: boolean;
  notification: NotificationItem;
  onAcceptCollab: (event: MouseEvent, notification: NotificationItem) => void;
  onAcceptGroupInvite: (event: MouseEvent, notification: NotificationItem) => void;
  onClick: (notification: NotificationItem) => void;
  onDelete: (event: MouseEvent, notificationId: string) => void;
  onEnterRoom: (event: MouseEvent, notification: NotificationItem) => void;
  onSenderClick: (event: MouseEvent, senderId: string) => void;
};

const NotificationCard = memo(({
  isActionActive,
  isDeletingOne,
  notification,
  onAcceptCollab,
  onAcceptGroupInvite,
  onClick,
  onDelete,
  onEnterRoom,
  onSenderClick,
}: NotificationCardProps) => {
  const avatarUrl = getAvatarUrl(notification);
  const thumbnailUrl = getNotificationThumbnailUrl(notification);
  const isUnread = !notification.isRead;

  return (
    <article
      className={`notification-card ${isUnread ? 'is-unread' : ''}`}
      onClick={() => onClick(notification)}
    >
      <span className="notification-card__type">{getNotificationIcon(notification.type)}</span>
      <button
        type="button"
        className="notification-card__avatar"
        onClick={(event) => onSenderClick(event, notification.sender._id)}
        aria-label={`Open ${notification.sender.userName}'s profile`}
      >
        <AvatarImage src={avatarUrl} fallback={<UserRound size={18} aria-hidden="true" />} />
      </button>

      <div className="notification-card__body">
        <p>{getNotificationText(notification)}</p>
        <span>{formatNotificationDate(notification.createdAt)}</span>
        {notification.type === 'COLLAB_REQUEST' && (
          <button
            type="button"
            className="notification-card__action"
            disabled={isActionActive}
            onClick={(event) => onAcceptCollab(event, notification)}
          >
            {isActionActive ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            {!isActionActive && 'Accept Request'}
          </button>
        )}
        {notification.type === 'COLLAB_ACCEPTED' && (
          <button
            type="button"
            className="notification-card__action"
            disabled={isActionActive}
            onClick={(event) => onEnterRoom(event, notification)}
          >
            {isActionActive ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <LogIn size={14} aria-hidden="true" />}
            {!isActionActive && 'Enter Room'}
          </button>
        )}
        {notification.type === 'GROUP_INVITE' && (
          <button
            type="button"
            className="notification-card__action"
            disabled={isActionActive}
            onClick={(event) => onAcceptGroupInvite(event, notification)}
          >
            {isActionActive ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            {!isActionActive && 'Accept Invite'}
          </button>
        )}
      </div>

      {thumbnailUrl && (
        <span className="notification-card__thumbnail">
          <Image src={thumbnailUrl} type="thumbnail" alt="" />
        </span>
      )}

      <Button
        variant="ghost"
        className="button--icon notification-card__delete"
        onClick={(event) => onDelete(event, notification._id)}
        disabled={isDeletingOne}
        aria-label="Delete notification"
      >
        <Trash2 size={16} aria-hidden="true" />
      </Button>
    </article>
  );
});

NotificationCard.displayName = 'NotificationCard';

const NotificationsPage = () => {
  const {
    activeActionId,
    error,
    handleAcceptCollabFromNotification,
    handleAcceptGroupInviteFromNotification,
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
    notificationsData,
    refetch,
    unreadCount,
  } = useNotificationsPage();

  return (
    <main className="dashboard-shell dashboard-shell--wide notifications-shell">
      <section className="dashboard-panel dashboard-panel--wide notifications-panel">
        <header className="notifications-header">
          <div className="notifications-header__title">
            <span className="notifications-header__icon">
              <Bell size={24} aria-hidden="true" />
              {unreadCount > 0 && <small>{unreadCount > 99 ? '99+' : unreadCount}</small>}
            </span>
            <div>
              <h1>Notifications</h1>
              <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : "You're all caught up"}</p>
            </div>
          </div>

          <div className="notifications-header__actions">
            {notifications.length > 0 && (
              <Button variant="danger" onClick={handleDeleteAllNotifications} isLoading={isDeletingAll} loadingLabel="Clearing notifications">
                <Trash2 size={18} aria-hidden="true" />
                Clear all
              </Button>
            )}
          </div>
        </header>

        {isError ? (
          <section className="post-empty-state notifications-state">
            <RefreshCw size={24} aria-hidden="true" />
            <p>{getErrorMessage(error, 'Notifications could not be loaded.')}</p>
            <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
          </section>
        ) : isLoading ? (
          <LoadingSpinner className="post-empty-state notifications-state" label="Loading notifications" />
        ) : notifications.length > 0 ? (
          <section className="notifications-list" aria-label="Notifications list">
            {notifications.map((notification) => (
              <ErrorBoundary
                key={notification._id}
                variant="section"
                title="Notification could not be rendered."
                resetKeys={[notification._id, notification.isRead]}
                showReload={false}
              >
                <NotificationCard
                  isActionActive={activeActionId === notification._id}
                  isDeletingOne={isDeletingOne}
                  notification={notification}
                  onAcceptCollab={handleAcceptCollabFromNotification}
                  onAcceptGroupInvite={handleAcceptGroupInviteFromNotification}
                  onClick={handleNotificationClick}
                  onDelete={handleDeleteNotification}
                  onEnterRoom={handleEnterRoomFromNotification}
                  onSenderClick={handleSenderClick}
                />
              </ErrorBoundary>
            ))}

            {notificationsData?.hasMore && (
              <div className="notifications-load-more">
                <Button variant="secondary" onClick={handleLoadMore} isLoading={isFetching} loadingLabel="Loading notifications">
                  <RefreshCw size={18} aria-hidden="true" />
                  Load more
                </Button>
              </div>
            )}
          </section>
        ) : (
          <section className="post-empty-state notifications-state">
            <Bell size={26} aria-hidden="true" />
            <p>No notifications yet.</p>
          </section>
        )}
      </section>
    </main>
  );
};

export default NotificationsPage;
