import { useAppSelector } from '@/app/store/hooks';
import { chatApi } from '@/features/messages/api/chat.api';

const useUnreadMessagesCount = () => {
  const userId = useAppSelector((state) => state.auth.user?._id);
  const { data } = chatApi.endpoints.getConversations.useQueryState(undefined);

  if (!userId) return 0;

  return data?.conversations?.reduce((count, conversation) => {
    const hasIncomingUnread = conversation.isUnread && conversation.lastMessage?.sender !== userId;
    return hasIncomingUnread ? count + 1 : count;
  }, 0) || 0;
};

export default useUnreadMessagesCount;
