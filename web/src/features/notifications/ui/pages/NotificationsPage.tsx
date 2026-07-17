import { Bell, Check, Loader2, LogIn, RefreshCw, Trash2, UserRound } from 'lucide-react';

import {
  getNotificationIcon,
  getNotificationText,
  getNotificationThumbnailUrl,
} from '@/features/notifications/model/notification.helpers';
import type { NotificationItem } from '@/features/notifications/model/notification.types';
import Button from '@/shared/ui/Button';
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
              <p className="state-panel__eyebrow">Activity Center</p>
              <h1>Notifications</h1>
              <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : "You're all caught up"}</p>
            </div>
          </div>

          <div className="notifications-header__actions">
            <Button variant="ghost" className="button--icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh notifications">
              {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
            </Button>
            {notifications.length > 0 && (
              <Button variant="danger" onClick={handleDeleteAllNotifications} disabled={isDeletingAll}>
                {isDeletingAll ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
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
          <section className="post-empty-state notifications-state">
            <Loader2 className="spin" aria-hidden="true" />
            <p>Loading notifications...</p>
          </section>
        ) : notifications.length > 0 ? (
          <section className="notifications-list" aria-label="Notifications list">
            {notifications.map((notification) => {
              const avatarUrl = getAvatarUrl(notification);
              const thumbnailUrl = getNotificationThumbnailUrl(notification);
              const isUnread = !notification.isRead;

              return (
                <article
                  className={`notification-card ${isUnread ? 'is-unread' : ''}`}
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-card__type">{getNotificationIcon(notification.type)}</span>
                  <button
                    type="button"
                    className="notification-card__avatar"
                    onClick={(event) => handleSenderClick(event, notification.sender._id)}
                    aria-label={`Open ${notification.sender.userName}'s profile`}
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={18} aria-hidden="true" />}
                  </button>

                  <div className="notification-card__body">
                    <p>{getNotificationText(notification)}</p>
                    <span>{formatNotificationDate(notification.createdAt)}</span>
                    {notification.type === 'COLLAB_REQUEST' && (
                      <button
                        type="button"
                        className="notification-card__action"
                        disabled={activeActionId === notification._id}
                        onClick={(event) => handleAcceptCollabFromNotification(event, notification)}
                      >
                        {activeActionId === notification._id ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                        {activeActionId === notification._id ? 'Accepting...' : 'Accept Request'}
                      </button>
                    )}
                    {notification.type === 'COLLAB_ACCEPTED' && (
                      <button
                        type="button"
                        className="notification-card__action"
                        disabled={activeActionId === notification._id}
                        onClick={(event) => handleEnterRoomFromNotification(event, notification)}
                      >
                        {activeActionId === notification._id ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <LogIn size={14} aria-hidden="true" />}
                        {activeActionId === notification._id ? 'Opening...' : 'Enter Room'}
                      </button>
                    )}
                    {notification.type === 'GROUP_INVITE' && (
                      <button
                        type="button"
                        className="notification-card__action"
                        disabled={activeActionId === notification._id}
                        onClick={(event) => handleAcceptGroupInviteFromNotification(event, notification)}
                      >
                        {activeActionId === notification._id ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                        {activeActionId === notification._id ? 'Joining...' : 'Accept Invite'}
                      </button>
                    )}
                  </div>

                  {thumbnailUrl && (
                    <span className="notification-card__thumbnail">
                      <img src={thumbnailUrl} alt="" />
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    className="button--icon notification-card__delete"
                    onClick={(event) => handleDeleteNotification(event, notification._id)}
                    disabled={isDeletingOne}
                    aria-label="Delete notification"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </article>
              );
            })}

            {notificationsData?.hasMore && (
              <div className="notifications-load-more">
                <Button variant="secondary" onClick={handleLoadMore} disabled={isFetching}>
                  {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
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
