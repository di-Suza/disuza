import { Bell, Code2, Heart, MessageCircle, MessageCircleReply, Repeat2, UserCheck, UserPlus, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import type { NotificationCommentContent, NotificationContent, NotificationItem, NotificationType } from './notification.types';

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object');

const getUserName = (notification: NotificationItem) => notification.sender?.userName || 'Someone';

const getPostMediaUrl = (content: NotificationContent | undefined) => {
  if (!isRecord(content)) return null;

  const record = content as Record<string, unknown>;
  const media = record.media;

  if (Array.isArray(media) && isRecord(media[0]) && typeof media[0].url === 'string') {
    return media[0].url;
  }

  const post = record.post;

  if (isRecord(post) && Array.isArray(post.media) && isRecord(post.media[0]) && typeof post.media[0].url === 'string') {
    return post.media[0].url;
  }

  return null;
};

const getContentPostId = (content: NotificationContent | undefined) => {
  if (!isRecord(content)) return null;

  const record = content as Record<string, unknown>;

  if (typeof record._id === 'string') return record._id;

  const post = record.post;

  if (isRecord(post) && typeof post._id === 'string') return post._id;

  return null;
};

const getCommentPreview = (content: NotificationContent | undefined) => {
  if (!isRecord(content)) return null;

  return typeof (content as NotificationCommentContent).comment === 'string'
    ? (content as NotificationCommentContent).comment
    : null;
};

export const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'FOLLOW':
      return <UserPlus size={18} aria-hidden="true" />;
    case 'LIKE':
      return <Heart size={18} aria-hidden="true" />;
    case 'COMMENT':
      return <MessageCircle size={18} aria-hidden="true" />;
    case 'COMMENT_REPLY':
      return <MessageCircleReply size={18} aria-hidden="true" />;
    case 'REPOST':
      return <Repeat2 size={18} aria-hidden="true" />;
    case 'COLLAB_REQUEST':
      return <Code2 size={18} aria-hidden="true" />;
    case 'COLLAB_ACCEPTED':
      return <UserCheck size={18} aria-hidden="true" />;
    case 'GROUP_INVITE':
      return <Users size={18} aria-hidden="true" />;
    default:
      return <Bell size={18} aria-hidden="true" />;
  }
};

export const getNotificationText = (notification: NotificationItem): ReactNode => {
  const senderName = getUserName(notification);
  const commentPreview = getCommentPreview(notification.contentId);

  switch (notification.type) {
    case 'FOLLOW':
      return <><strong>{senderName}</strong> started following you</>;
    case 'LIKE':
      return <><strong>{senderName}</strong> liked your post</>;
    case 'COMMENT':
      return <><strong>{senderName}</strong> commented{commentPreview ? `: ${commentPreview}` : ' on your post'}</>;
    case 'COMMENT_REPLY':
      return <><strong>{senderName}</strong> replied{commentPreview ? `: ${commentPreview}` : ' to your comment'}</>;
    case 'REPOST':
      return <><strong>{senderName}</strong> reposted your post</>;
    case 'COLLAB_REQUEST':
      return <><strong>{senderName}</strong> sent you a collab request</>;
    case 'COLLAB_ACCEPTED':
      return <><strong>{senderName}</strong> accepted your collab request</>;
    case 'GROUP_INVITE': {
      const content = isRecord(notification.contentId) ? notification.contentId as Record<string, unknown> : null;
      const groupName = typeof content?.groupName === 'string'
        ? content.groupName
        : 'a group';
      return <><strong>{senderName}</strong> invited you to <strong>{groupName}</strong></>;
    }
    default:
      return <><strong>{senderName}</strong> sent you a notification</>;
  }
};

export const getNotificationThumbnailUrl = (notification: NotificationItem) => getPostMediaUrl(notification.contentId);
export const getNotificationPostId = (notification: NotificationItem) => getContentPostId(notification.contentId);
