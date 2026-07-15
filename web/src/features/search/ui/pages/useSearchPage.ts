import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import type { RootState } from '@/app/store/store';
import type { Post } from '@/features/posts/model/post.types';
import { useDiscoverQuery, useSearchQuery } from '@/features/search/api/search.api';
import type { SearchUser } from '@/features/search/model/search.types';
import useDebounce from '@/shared/hooks/useDebounce';

const DISCOVER_PAGE_SIZE = 8;
const SEARCH_PAGE_SIZE = 10;

type SearchMeta = {
  totalUsers: number;
  totalPosts: number;
  hasMoreUsers: boolean;
  hasMorePosts: boolean;
};

type AppliedSearch = {
  query: string;
  userPage: number;
  postPage: number;
};

const emptySearchMeta: SearchMeta = {
  totalUsers: 0,
  totalPosts: 0,
  hasMoreUsers: false,
  hasMorePosts: false,
};

const mergeById = <T extends { _id: string }>(previousItems: T[], nextItems: T[]) => {
  const existingIds = new Set(previousItems.map((item) => item._id));
  const uniqueNextItems = nextItems.filter((item) => !existingIds.has(item._id));
  return [...previousItems, ...uniqueNextItems];
};

export const useSearchPage = () => {
  const currentUserId = useSelector((state: RootState) => state.auth.user?._id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setSearchFocused] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [searchUserPage, setSearchUserPage] = useState(1);
  const [searchPostPage, setSearchPostPage] = useState(1);
  const [topContributors, setTopContributors] = useState<SearchUser[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [matchedUsers, setMatchedUsers] = useState<SearchUser[]>([]);
  const [matchedPosts, setMatchedPosts] = useState<Post[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchMeta>(emptySearchMeta);
  const [hasMoreTrendingPosts, setHasMoreTrendingPosts] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 450);
  const activeSearchQuery = searchQuery.trim();
  const committedSearchQuery = debouncedSearchQuery.trim();
  const appliedSearchRef = useRef<AppliedSearch>({ query: '', userPage: 0, postPage: 0 });
  const routeQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (routeQuery && routeQuery !== searchQuery) {
      setSearchQuery(routeQuery);
    }
  }, [routeQuery, searchQuery]);

  const resetSearchResults = useCallback((query = '') => {
    setSearchUserPage(1);
    setSearchPostPage(1);
    setMatchedUsers([]);
    setMatchedPosts([]);
    setSearchMeta(emptySearchMeta);
    appliedSearchRef.current = { query, userPage: 0, postPage: 0 };
  }, []);

  const {
    data: discoverData,
    error: discoverError,
    isError: isDiscoverError,
    isFetching: isDiscoverFetching,
    refetch: refetchDiscover,
  } = useDiscoverQuery({ page: discoverPage, limit: DISCOVER_PAGE_SIZE });

  useEffect(() => {
    const data = discoverData?.data;
    if (!data) return;

    setTopContributors(data.topContributors || []);
    setHasMoreTrendingPosts(Boolean(data.hasMoreTrendingPosts));
    setTrendingPosts((previousPosts) => {
      const nextPosts = data.trendingPosts || [];
      return (data.page || discoverPage) === 1 ? nextPosts : mergeById(previousPosts, nextPosts);
    });
  }, [discoverData, discoverPage]);

  useEffect(() => {
    resetSearchResults(committedSearchQuery);
  }, [committedSearchQuery, resetSearchResults]);

  const {
    currentData: searchData,
    error: searchError,
    isError: isSearchError,
    isFetching: isSearchFetching,
    isLoading: isSearchLoading,
    refetch: refetchSearch,
  } = useSearchQuery(
    {
      q: committedSearchQuery,
      userPage: searchUserPage,
      postPage: searchPostPage,
      limit: SEARCH_PAGE_SIZE,
    },
    { skip: committedSearchQuery === '' },
  );

  useEffect(() => {
    const results = searchData?.results;
    const query = committedSearchQuery;

    if (!results || !query || activeSearchQuery !== query) return;

    const users = results.matchedUsers || results.users || [];
    const posts = results.matchedPosts || results.posts || [];
    const resolvedUserPage = results.userPage || searchUserPage;
    const resolvedPostPage = results.postPage || searchPostPage;
    const appliedSearch = appliedSearchRef.current;
    const isNewQuery = appliedSearch.query !== query;

    setSearchMeta({
      totalUsers: Number(results.totalUsers || 0),
      totalPosts: Number(results.totalPosts || 0),
      hasMoreUsers: Boolean(results.hasMoreUsers),
      hasMorePosts: Boolean(results.hasMorePosts),
    });

    if (isNewQuery || resolvedUserPage !== appliedSearch.userPage) {
      setMatchedUsers((previousUsers) => (
        isNewQuery || resolvedUserPage === 1 ? users : mergeById(previousUsers, users)
      ));
      appliedSearchRef.current.userPage = resolvedUserPage;
    }

    if (isNewQuery || resolvedPostPage !== appliedSearch.postPage) {
      setMatchedPosts((previousPosts) => (
        isNewQuery || resolvedPostPage === 1 ? posts : mergeById(previousPosts, posts)
      ));
      appliedSearchRef.current.postPage = resolvedPostPage;
    }

    appliedSearchRef.current.query = query;
  }, [activeSearchQuery, committedSearchQuery, searchData, searchPostPage, searchUserPage]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setSearchQuery(nextQuery);
    setSearchParams(nextQuery.trim() ? { q: nextQuery } : {}, { replace: true });

    if (nextQuery.trim() !== appliedSearchRef.current.query) {
      resetSearchResults(nextQuery.trim());
    }
  }, [resetSearchResults, setSearchParams]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchParams({}, { replace: true });
    resetSearchResults('');
  }, [resetSearchResults, setSearchParams]);

  const handleLoadMoreTrendingPosts = useCallback(() => {
    if (!isDiscoverFetching && hasMoreTrendingPosts) {
      setDiscoverPage((currentPage) => currentPage + 1);
    }
  }, [hasMoreTrendingPosts, isDiscoverFetching]);

  const handleLoadMoreSearchUsers = useCallback(() => {
    if (!isSearchFetching && searchMeta.hasMoreUsers) {
      setSearchUserPage((currentPage) => currentPage + 1);
    }
  }, [isSearchFetching, searchMeta.hasMoreUsers]);

  const handleLoadMoreSearchPosts = useCallback(() => {
    if (!isSearchFetching && searchMeta.hasMorePosts) {
      setSearchPostPage((currentPage) => currentPage + 1);
    }
  }, [isSearchFetching, searchMeta.hasMorePosts]);

  const hasActiveSearchQuery = Boolean(activeSearchQuery);
  const isSearchPending = activeSearchQuery !== committedSearchQuery || (
    hasActiveSearchQuery && (
      isSearchLoading || (isSearchFetching && matchedUsers.length === 0 && matchedPosts.length === 0)
    )
  );

  return {
    currentUserId,
    error: hasActiveSearchQuery ? searchError : discoverError,
    handleClearSearch,
    handleLoadMoreSearchPosts,
    handleLoadMoreSearchUsers,
    handleLoadMoreTrendingPosts,
    handleSearchBlur: () => setSearchFocused(false),
    handleSearchChange,
    handleSearchFocus: () => setSearchFocused(true),
    hasActiveSearchQuery,
    hasMoreSearchPosts: searchMeta.hasMorePosts,
    hasMoreSearchUsers: searchMeta.hasMoreUsers,
    hasMoreTrendingPosts,
    isDiscoverFetching,
    isError: hasActiveSearchQuery ? isSearchError : isDiscoverError,
    isFetching: hasActiveSearchQuery ? isSearchFetching : isDiscoverFetching,
    isSearchFocused,
    isSearchPending,
    matchedPosts,
    matchedUsers,
    refetch: hasActiveSearchQuery ? refetchSearch : refetchDiscover,
    searchQuery,
    topContributors,
    totalPosts: searchMeta.totalPosts,
    totalUsers: searchMeta.totalUsers,
    trendingPosts,
  };
};
