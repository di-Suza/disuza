import { useAppSelector } from '@/app/store/hooks';
import { chatApi } from '@/features/messages/api/chat.api';
import { getUnreadMessagesCount } from './unreadCount.helpers';

const useUnreadMessagesCount = () => {
  const userId = useAppSelector((state) => state.auth.user?._id);
  const { data } = chatApi.endpoints.getConversations.useQueryState(undefined);

  if (!userId) return 0;

  return getUnreadMessagesCount(data?.conversations, userId);
};

export default useUnreadMessagesCount;
