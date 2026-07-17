import { useAppSelector } from '@/app/store/hooks';
import { chatApi } from '@/features/messages/api/chat.api';

const useUnreadMessagesCount = () => {
  const userId = useAppSelector((state) => state.auth.user?._id);
  const { data } = chatApi.endpoints.getConversations.useQueryState(undefined);

  if (!userId) return 0;

  return data?.conversations?.reduce((count, conversation) => {
    const hasIncomingUnread = (conversation.isUnread || Number(conversation.unreadCount || 0) > 0)
      && conversation.lastMessage?.sender !== userId;

    if (!hasIncomingUnread) return count;

    return count + Math.max(1, Number(conversation.unreadCount || 0));
  }, 0) || 0;
};

export default useUnreadMessagesCount;
