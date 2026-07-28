import { useAppSelector } from '@/app/store/hooks';
import { chatApi } from '@/features/messages/api/chat.api';
import { getUnreadMessagesCount } from './unreadCount.helpers';

const useUnreadMessagesCount = () => {
  const userId = useAppSelector((state) => state.auth.user?._id);
  const { unreadCount } = chatApi.endpoints.getConversations.useQueryState(undefined, {
    selectFromResult: ({ data }) => ({
      unreadCount: userId ? getUnreadMessagesCount(data?.conversations, userId) : 0,
    }),
  });

  return unreadCount;
};

export default useUnreadMessagesCount;
