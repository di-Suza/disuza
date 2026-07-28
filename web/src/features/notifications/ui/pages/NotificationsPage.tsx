import { Bell, Check, Loader2, LogIn, MoreHorizontal, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { memo, useEffect, useMemo, useState, type MouseEvent } from 'react';

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

type NotificationFilter = 'all' | 'comments' | 'follows' | 'likes';

type NotificationSection = {
  label: string;
  notifications: NotificationItem[];
};

const NOTIFICATION_FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'comments', label: 'Comments' },
  { id: 'follows', label: 'Follows' },
  { id: 'likes', label: 'Likes' },
];

const getAvatarUrl = (notification: NotificationItem) => {
  const url = notification.sender?.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : null;
};

const isSameLocalDay = (first: Date, second: Date) => (
  first.getFullYear() === second.getFullYear()
  && first.getMonth() === second.getMonth()
  && first.getDate() === second.getDate()
);

const getDateGroupLabel = (value?: string) => {
  if (!value) return 'Earlier';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(date, today)) return 'Today';
  if (isSameLocalDay(date, yesterday)) return 'Yesterday';

  const includeYear = date.getFullYear() !== today.getFullYear();
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
};

const formatNotificationDate = (value?: string) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

const filterNotifications = (notifications: NotificationItem[], filter: NotificationFilter) => {
  if (filter === 'all') return notifications;
  if (filter === 'comments') return notifications.filter((notification) => notification.type === 'COMMENT' || notification.type === 'COMMENT_REPLY');
  if (filter === 'follows') return notifications.filter((notification) => notification.type === 'FOLLOW');
  return notifications.filter((notification) => notification.type === 'LIKE');
};

const groupNotificationsByDate = (notifications: NotificationItem[]): NotificationSection[] => notifications.reduce<NotificationSection[]>((sections, notification) => {
  const label = getDateGroupLabel(notification.createdAt);
  const currentSection = sections[sections.length - 1];

  if (currentSection?.label === label) {
    currentSection.notifications.push(notification);
    return sections;
  }

  sections.push({ label, notifications: [notification] });
  return sections;
}, []);

type NotificationCardProps = {
  isActionActive: boolean;
  isDeletingOne: boolean;
  isMenuOpen: boolean;
  notification: NotificationItem;
  onAcceptCollab: (event: MouseEvent, notification: NotificationItem) => void;
  onAcceptGroupInvite: (event: MouseEvent, notification: NotificationItem) => void;
  onClick: (notification: NotificationItem) => void;
  onDelete: (event: MouseEvent, notificationId: string) => void;
  onEnterRoom: (event: MouseEvent, notification: NotificationItem) => void;
  onSenderClick: (event: MouseEvent, senderId: string) => void;
  onToggleMenu: (event: MouseEvent, notificationId: string) => void;
};

const NotificationCard = memo(({
  isActionActive,
  isDeletingOne,
  isMenuOpen,
  notification,
  onAcceptCollab,
  onAcceptGroupInvite,
  onClick,
  onDelete,
  onEnterRoom,
  onSenderClick,
  onToggleMenu,
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

      <div className="notification-card__menu" onClick={(event) => event.stopPropagation()}>
        <Button
          variant="ghost"
          className="button--icon notification-card__menu-trigger"
          onClick={(event) => onToggleMenu(event, notification._id)}
          disabled={isDeletingOne}
          aria-expanded={isMenuOpen}
          aria-label="Notification actions"
        >
          <MoreHorizontal size={17} aria-hidden="true" />
        </Button>
        {isMenuOpen && (
          <div className="notification-card__menu-dropdown" role="menu">
            <button type="button" onClick={(event) => onDelete(event, notification._id)} disabled={isDeletingOne} role="menuitem">
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
});

NotificationCard.displayName = 'NotificationCard';

const NotificationsPage = () => {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
  const filteredNotifications = useMemo(() => filterNotifications(notifications, activeFilter), [activeFilter, notifications]);
  const notificationSections = useMemo(() => groupNotificationsByDate(filteredNotifications), [filteredNotifications]);
  const emptyMessage = activeFilter === 'all' ? 'No notifications yet.' : `No ${NOTIFICATION_FILTERS.find((filter) => filter.id === activeFilter)?.label.toLowerCase()} notifications yet.`;

  useEffect(() => {
    if (!openMenuId) return undefined;

    const closeMenu = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.notification-card__menu')) return;
      setOpenMenuId(null);
    };

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [openMenuId]);

  const handleFilterChange = (filter: NotificationFilter) => {
    setActiveFilter(filter);
    setOpenMenuId(null);
  };

  const handleToggleMenu = (event: MouseEvent, notificationId: string) => {
    event.stopPropagation();
    setOpenMenuId((currentId) => (currentId === notificationId ? null : notificationId));
  };

  const handleDeleteFromMenu = (event: MouseEvent, notificationId: string) => {
    setOpenMenuId(null);
    handleDeleteNotification(event, notificationId);
  };

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

        <nav className="notifications-tabs" aria-label="Notification filters">
          {NOTIFICATION_FILTERS.map((filter) => (
            <button
              type="button"
              key={filter.id}
              className={activeFilter === filter.id ? 'is-active' : ''}
              onClick={() => handleFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        {isError ? (
          <section className="post-empty-state notifications-state">
            <RefreshCw size={24} aria-hidden="true" />
            <p>{getErrorMessage(error, 'Notifications could not be loaded.')}</p>
            <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
          </section>
        ) : isLoading ? (
          <LoadingSpinner className="post-empty-state notifications-state" label="Loading notifications" />
        ) : (
          <section className="notifications-list" aria-label="Notifications list">
            {notificationSections.length > 0 ? (
              notificationSections.map((section) => (
                <div className="notifications-section" key={section.label}>
                  <span className="notifications-section__label">{section.label}</span>
                  {section.notifications.map((notification) => (
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
                        isMenuOpen={openMenuId === notification._id}
                        notification={notification}
                        onAcceptCollab={handleAcceptCollabFromNotification}
                        onAcceptGroupInvite={handleAcceptGroupInviteFromNotification}
                        onClick={handleNotificationClick}
                        onDelete={handleDeleteFromMenu}
                        onEnterRoom={handleEnterRoomFromNotification}
                        onSenderClick={handleSenderClick}
                        onToggleMenu={handleToggleMenu}
                      />
                    </ErrorBoundary>
                  ))}
                </div>
              ))
            ) : (
              <section className="post-empty-state notifications-state">
                <Bell size={26} aria-hidden="true" />
                <p>{emptyMessage}</p>
              </section>
            )}

            {notificationsData?.hasMore && (
              <div className="notifications-load-more">
                <Button variant="secondary" onClick={handleLoadMore} isLoading={isFetching} loadingLabel="Loading notifications">
                  <RefreshCw size={18} aria-hidden="true" />
                  Load more
                </Button>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
};

export default NotificationsPage;
