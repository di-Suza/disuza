import type { ProfilePicture } from '@/features/auth/model/auth.types';
import type { Post } from '@/features/posts/model/post.types';

export type NotificationType = 'LIKE' | 'FOLLOW' | 'COMMENT' | 'COMMENT_REPLY' | 'REPOST' | 'COLLAB_REQUEST' | 'COLLAB_ACCEPTED' | 'GROUP_INVITE';
export type NotificationTargetModel = 'Post' | 'User' | 'Comment' | 'CollabRequest' | 'CollabRoom' | 'Conversation';

export type NotificationSender = {
  _id: string;
  userName: string;
  profilePicture?: ProfilePicture;
  headline?: string;
};

export type NotificationCommentContent = {
  _id: string;
  comment?: string;
  post?: Pick<Post, '_id' | 'caption' | 'media'>;
};

export type NotificationConversationContent = {
  _id: string;
  groupName?: string;
  isGroup?: boolean;
};

export type NotificationContent = Pick<Post, '_id' | 'caption' | 'media'> | NotificationSender | NotificationCommentContent | NotificationConversationContent | string | null;

export type NotificationItem = {
  _id: string;
  isRead: boolean;
  type: NotificationType;
  contentId?: NotificationContent;
  onModel?: NotificationTargetModel;
  recipient: string;
  sender: NotificationSender;
  createdAt?: string;
  updatedAt?: string;
};

export type NotificationsResponse = {
  success: boolean;
  message: string;
  notifications: NotificationItem[];
  unreadCount: number;
  currentPage: number;
  hasMore: boolean;
};

export type NotificationsQueryArgs = {
  page?: number;
  limit?: number;
};

export type NotificationMutationResponse = {
  success: boolean;
  message: string;
};
