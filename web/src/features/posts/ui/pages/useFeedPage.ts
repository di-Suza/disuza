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
  const [loadedPostIds, setLoadedPostIds] = useState<string[]>([]);
  const feedQueryArgs = useMemo(
    () => ({ page, limit: 10, type: feedType, excludePostIds: page > 1 ? loadedPostIds : undefined }),
    [feedType, loadedPostIds, page],
  );
  const { data, isError, isFetching, isLoading, refetch } = useGetFeedQuery(feedQueryArgs);

  useEffect(() => {
    setPage(1);
    setLoadedPostIds([]);
  }, [feedType]);

  const loadMore = useCallback(() => {
    if (isFetching || !data?.hasMore) return;
    setLoadedPostIds(data.posts.map((post) => post._id).filter(Boolean));
    setPage((currentPage) => currentPage + 1);
  }, [data?.hasMore, data?.posts, isFetching]);

  const refresh = useCallback(() => {
    setLoadedPostIds([]);

    if (page === 1) {
      refetch();
      return;
    }

    setPage(1);
  }, [page, refetch]);

  useEffect(() => {
    const ids = data?.posts?.map((post) => post._id).filter(Boolean) || [];
    if (ids.length === 0 && loadedPostIds.length === 0) return;

    setLoadedPostIds((currentIds) => {
      const nextIds = page <= 1 ? ids : Array.from(new Set([...currentIds, ...ids]));

      if (nextIds.length === currentIds.length && nextIds.every((postId, index) => postId === currentIds[index])) {
        return currentIds;
      }

      return nextIds;
    });
  }, [data?.posts, loadedPostIds.length, page]);

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
