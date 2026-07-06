import { useMemo, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import { useGetFeedQuery } from '@/features/posts/api/post.api';
import type { FeedType } from '@/features/posts/model/post.types';

export const useFeedPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [feedType, setFeedType] = useState<FeedType>('all');
  const { data, isError, isFetching, isLoading, refetch } = useGetFeedQuery({ page: 1, limit: 10, type: feedType });

  return useMemo(() => ({
    feedType,
    hasMore: Boolean(data?.hasMore),
    isError,
    isFetching,
    isLoading,
    posts: data?.posts || [],
    refetch,
    setFeedType,
    user,
  }), [data?.hasMore, data?.posts, feedType, isError, isFetching, isLoading, refetch, user]);
};