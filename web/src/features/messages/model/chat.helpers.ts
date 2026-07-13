import type { ChatConversation, ChatMessage, ChatUser, FeedbackDetails } from './chat.types';

export const formatChatMessageTime = (createdAt?: string) => {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getChatMessageDateKey = (createdAt?: string) => {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export const formatChatDateDivider = (createdAt?: string) => {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (firstDate: Date, secondDate: Date) => (
    firstDate.getDate() === secondDate.getDate()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getFullYear() === secondDate.getFullYear()
  );

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
};

export const getUserInitial = (user?: Pick<ChatUser, 'userName'> | null) => (
  user?.userName?.trim()?.charAt(0)?.toUpperCase() || 'U'
);

export const getUserAvatarUrl = (user?: Pick<ChatUser, 'profilePicture'> | null) => {
  const url = user?.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : null;
};

export const getConversationTitle = (conversation?: ChatConversation | null) => (
  conversation?.otherUser?.userName || 'User'
);

export const getFeedbackMediaUrl = (details?: FeedbackDetails | null) => {
  const media = details?.images?.[0] || details?.media?.[0];
  return typeof media?.url === 'string' && media.url.trim() ? media.url : null;
};

export const isMessageFromUser = (message: ChatMessage, userId?: string | null) => (
  Boolean(userId) && message.sender?.toString() === userId?.toString()
);
