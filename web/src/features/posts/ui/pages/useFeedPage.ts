import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useGetFeedQuery } from '@/features/posts/api/post.api';
import type { FeedType } from '@/features/posts/model/post.types';
import { preservedFeedPagination, resetPreservedFeedPagination } from '@/features/posts/state/feedPaginationState';

export const useFeedPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const feedType: FeedType = searchParams.get('type') === 'following' ? 'following' : 'all';
  const [page, setPage] = useState(() => (preservedFeedPagination.feedType === feedType ? preservedFeedPagination.page : 1));
  const [loadedPostIds, setLoadedPostIds] = useState<string[]>(() => (
    preservedFeedPagination.feedType === feedType ? preservedFeedPagination.loadedPostIds : []
  ));
  const feedQueryArgs = useMemo(
    () => ({ page, limit: 10, type: feedType, excludePostIds: page > 1 ? loadedPostIds : undefined }),
    [feedType, loadedPostIds, page],
  );
  const { data, isError, isFetching, isLoading, refetch } = useGetFeedQuery(feedQueryArgs);
  const shouldRecoverFromEmptyPage = Boolean(
    data
    && !isFetching
    && !isLoading
    && page > 1
    && loadedPostIds.length > 0
    && (data.posts?.length || 0) === 0,
  );

  useEffect(() => {
    if (preservedFeedPagination.feedType !== feedType) {
      preservedFeedPagination.feedType = feedType;
      preservedFeedPagination.loadedPostIds = [];
      preservedFeedPagination.page = 1;
      setPage(1);
      setLoadedPostIds([]);
      return;
    }

    preservedFeedPagination.loadedPostIds = loadedPostIds;
    preservedFeedPagination.page = page;
  }, [feedType, loadedPostIds, page]);

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

  const resetFeed = useCallback(() => {
    resetPreservedFeedPagination(feedType);
    setLoadedPostIds([]);

    if (page === 1) {
      refetch();
      return;
    }

    setPage(1);
  }, [feedType, page, refetch]);

  useEffect(() => {
    if (!shouldRecoverFromEmptyPage) return;

    resetPreservedFeedPagination(feedType);
    setLoadedPostIds([]);
    setPage(1);
  }, [feedType, shouldRecoverFromEmptyPage]);

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
    isLoading: isLoading || shouldRecoverFromEmptyPage,
    loadMore,
    page,
    posts: data?.posts || [],
    refetch: refresh,
    resetFeed,
    user,
  }), [data?.hasMore, data?.posts, feedType, isError, isFetching, isLoading, loadMore, page, refresh, resetFeed, shouldRecoverFromEmptyPage, user]);
};
