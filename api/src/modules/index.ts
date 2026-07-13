import type { Router } from 'express';

import { authRoutes } from './auth/index.js';
import { chatRoutes } from './chat/index.js';
import { commentRoutes } from './comments/index.js';
import { healthRoutes } from './health/index.js';
import { issueRoutes } from './issues/index.js';
import { mediaRoutes } from './media/index.js';
import { notificationRoutes } from './notifications/index.js';
import { postRoutes } from './posts/index.js';
import { reportRoutes } from './reports/index.js';
import { searchRoutes } from './search/index.js';
import { userRoutes } from './users/index.js';

type HttpRouteRegistration = Readonly<{
  module: string;
  path: `/api/${string}`;
  router: Router;
}>;

const httpRouteRegistry = [
  { module: 'health', path: '/api/health', router: healthRoutes },
  { module: 'issues', path: '/api/issue', router: issueRoutes },
  { module: 'auth', path: '/api/auth', router: authRoutes },
  { module: 'chat', path: '/api/chat', router: chatRoutes },
  { module: 'comments', path: '/api/comment', router: commentRoutes },
  { module: 'media', path: '/api/media', router: mediaRoutes },
  { module: 'notifications', path: '/api/notification', router: notificationRoutes },
  { module: 'posts', path: '/api/post', router: postRoutes },
  { module: 'reports', path: '/api/report', router: reportRoutes },
  { module: 'search', path: '/api/search', router: searchRoutes },
  { module: 'users', path: '/api/user', router: userRoutes },
] satisfies readonly HttpRouteRegistration[];

export { httpRouteRegistry };
export type { HttpRouteRegistration };
