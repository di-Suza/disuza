import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuthGuard } from './baseQueryWithAuth';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuthGuard,
  tagTypes: [
    'Auth',
    'ProfileUser',
    'Followers',
    'Following',
    'BlockedUsers',
    'UserRecommendations',
    'UserAccountHistory',
    'DashboardAnalytics',
    'Posts',
    'Post',
    'PostAnalytics',
    'Repost',
    'Reposts',
    'Feed',
    'Comments',
    'CommentReplies',
    'SavedPostsCollections',
    'SavedCollectionPosts',
    'Reports',
    'Notifications',
    'Search',
    'Issues',
    'Conversations',
    'Messages',
    'CollabStatus',
    'CollabRooms',
    'CollabRoom',
    'Problems',
  ],
  endpoints: () => ({}),
});
