import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useGetFeedQuery } from '@/features/posts/api/post.api';
import type { FeedType } from '@/features/posts/model/post.types';

export const useFeedPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const feedType: FeedType = searchParams.get('type') === 'following' ? 'following' : 'all';
  const [page, setPage] = useState(1);
  const { data, isError, isFetching, isLoading, refetch } = useGetFeedQuery({ page, limit: 10, type: feedType });

  useEffect(() => {
    setPage(1);
  }, [feedType]);

  const loadMore = useCallback(() => {
    if (isFetching || !data?.hasMore) return;
    setPage((currentPage) => currentPage + 1);
  }, [data?.hasMore, isFetching]);

  const refresh = useCallback(() => {
    if (page === 1) {
      refetch();
      return;
    }

    setPage(1);
  }, [page, refetch]);

  return useMemo(() => ({
    feedType,
    hasMore: Boolean(data?.hasMore),
    isError,
    isFetching,
    isLoading,
    loadMore,
    page,
    posts: data?.posts || [],
    refetch: refresh,
    user,
  }), [data?.hasMore, data?.posts, feedType, isError, isFetching, isLoading, loadMore, page, refresh, user]);
};
