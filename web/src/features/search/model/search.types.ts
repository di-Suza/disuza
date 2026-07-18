import type { Post } from '@/features/posts/model/post.types';
import type { UserProfile } from '@/features/users/model/user.types';

export type SearchUser = Pick<UserProfile, '_id' | 'userName' | 'profilePicture' | 'headline' | 'profileContributions' | 'followersCount'>;

export type SearchResults = {
  matchedUsers?: SearchUser[];
  matchedPosts?: Post[];
  users?: SearchUser[];
  posts?: Post[];
  totalUsers: number;
  totalPosts: number;
  hasMoreUsers: boolean;
  hasMorePosts: boolean;
  userPage: number;
  postPage: number;
};

export type SearchResponse = {
  success: boolean;
  message: string;
  results: SearchResults;
};

export type DiscoverData = {
  topContributors: SearchUser[];
  trendingPosts: Post[];
  hasMoreTrendingPosts: boolean;
  totalTrendingPosts: number;
  page: number;
};

export type DiscoverResponse = {
  success: boolean;
  message: string;
  data: DiscoverData;
};

export type SearchQueryArgs = {
  q: string;
  userPage?: number;
  postPage?: number;
  limit?: number;
};

export type DiscoverQueryArgs = {
  page?: number;
  limit?: number;
};
