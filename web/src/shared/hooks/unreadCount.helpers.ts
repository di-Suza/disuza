export type UnreadConversationLike = {
  isUnread?: boolean;
  lastMessage?: {
    sender?: string | null;
  } | null;
  unreadCount?: number | string | null;
};

export const getUnreadMessagesCount = (
  conversations: UnreadConversationLike[] | undefined,
  userId?: string | null,
) => {
  if (!userId || !Array.isArray(conversations)) return 0;

  return conversations.reduce((count, conversation) => {
    const unreadCount = Number(conversation.unreadCount || 0);
    const hasIncomingUnread = (conversation.isUnread || unreadCount > 0)
      && conversation.lastMessage?.sender !== userId;

    if (!hasIncomingUnread) return count;

    return count + Math.max(1, unreadCount);
  }, 0);
};

export const getUnreadNotificationsCount = (value: unknown) => {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};
