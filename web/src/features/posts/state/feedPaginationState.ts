import type { FeedType } from '../model/post.types';

type FeedPaginationState = {
  feedType: FeedType;
  loadedPostIds: string[];
  page: number;
};

export const preservedFeedPagination: FeedPaginationState = {
  feedType: 'all',
  loadedPostIds: [],
  page: 1,
};

export const resetPreservedFeedPagination = (feedType: FeedType = preservedFeedPagination.feedType) => {
  preservedFeedPagination.feedType = feedType;
  preservedFeedPagination.loadedPostIds = [];
  preservedFeedPagination.page = 1;
};
