import { useAppSelector } from '@/app/store/hooks';
import { chatApi } from '@/features/messages/api/chat.api';
import { getUnreadCountValue } from './unreadCount.helpers';

const useUnreadMessagesCount = () => {
  const userId = useAppSelector((state) => state.auth.user?._id);
  const { unreadCount } = chatApi.endpoints.getUnreadMessagesCount.useQueryState(undefined, {
    selectFromResult: ({ data }) => ({
      unreadCount: userId ? getUnreadCountValue(data?.unreadCount) : 0,
    }),
  });

  return unreadCount;
};

export default useUnreadMessagesCount;
