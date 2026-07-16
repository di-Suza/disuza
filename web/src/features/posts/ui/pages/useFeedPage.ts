import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useGetFeedQuery } from '@/features/posts/api/post.api';
import type { FeedType } from '@/features/posts/model/post.types';

export const useFeedPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const feedType: FeedType = searchParams.get('type') === 'following' ? 'following' : 'all';
  const { data, isError, isFetching, isLoading, refetch } = useGetFeedQuery({ page: 1, limit: 10, type: feedType });

  return useMemo(() => ({
    feedType,
    hasMore: Boolean(data?.hasMore),
    isError,
    isFetching,
    isLoading,
    posts: data?.posts || [],
    refetch,
    user,
  }), [data?.hasMore, data?.posts, feedType, isError, isFetching, isLoading, refetch, user]);
};
