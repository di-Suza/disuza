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
    'Posts',
    'Post',
    'Feed',
    'Comments',
    'CommentReplies',
  ],
  endpoints: () => ({}),
});
