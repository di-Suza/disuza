import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import app from '../../src/app.js';
import { createHttpClient, type TestHttpClient } from '../helpers/http.js';

type Endpoint = {
  method: string;
  path: string;
};

const objectId = '507f1f77bcf86cd799439011';
const anotherObjectId = '507f1f77bcf86cd799439012';

const protectedEndpoints: Endpoint[] = [
  { method: 'POST', path: '/api/issue' },

  { method: 'GET', path: '/api/auth/me' },
  { method: 'POST', path: '/api/auth/logoutAllDevices' },

  { method: 'POST', path: '/api/chat/sendMessage' },
  { method: 'POST', path: '/api/chat/startConversation' },
  { method: 'PATCH', path: `/api/chat/pin/${objectId}` },
  { method: 'POST', path: '/api/chat/groups' },
  { method: 'POST', path: `/api/chat/groups/${objectId}/accept` },
  { method: 'PATCH', path: `/api/chat/groups/${objectId}` },
  { method: 'POST', path: `/api/chat/groups/${objectId}/invite` },
  { method: 'DELETE', path: `/api/chat/groups/${objectId}/members/${anotherObjectId}` },
  { method: 'GET', path: '/api/chat/getConversations' },
  { method: 'GET', path: `/api/chat/getMessages/${objectId}` },
  { method: 'GET', path: `/api/chat/attachments/${objectId}/file-1` },
  { method: 'PATCH', path: `/api/chat/markAsRead/${objectId}` },
  { method: 'DELETE', path: `/api/chat/unsendMessage/${objectId}` },
  { method: 'DELETE', path: `/api/chat/deleteConversation/${objectId}` },

  { method: 'GET', path: '/api/collab/rooms' },
  { method: 'POST', path: '/api/collab/personal-room' },
  { method: 'GET', path: `/api/collab/status/${objectId}` },
  { method: 'POST', path: `/api/collab/request/${objectId}` },
  { method: 'POST', path: `/api/collab/accept/${objectId}` },
  { method: 'GET', path: `/api/collab/room/${objectId}` },

  { method: 'POST', path: '/api/comment/postComment' },
  { method: 'GET', path: `/api/comment/getAllComments/${objectId}` },
  { method: 'GET', path: `/api/comment/getReplies/${objectId}` },
  { method: 'DELETE', path: '/api/comment/deleteComment' },

  { method: 'GET', path: '/api/media/upload-auth' },

  { method: 'GET', path: '/api/notification/getNotifications' },
  { method: 'PATCH', path: '/api/notification/markAllAsRead' },
  { method: 'DELETE', path: `/api/notification/deleteNotification/${objectId}` },
  { method: 'DELETE', path: '/api/notification/deleteAllNotifications' },

  { method: 'POST', path: '/api/post/createPost' },
  { method: 'GET', path: '/api/post/getAllPosts' },
  { method: 'GET', path: `/api/post/getPost/${objectId}` },
  { method: 'GET', path: `/api/post/analytics/${objectId}` },
  { method: 'POST', path: `/api/post/analytics/${objectId}/link-click` },
  { method: 'PATCH', path: `/api/post/updatePost/${objectId}` },
  { method: 'DELETE', path: `/api/post/deletePost/${objectId}` },
  { method: 'POST', path: '/api/post/reportPost' },
  { method: 'POST', path: `/api/post/likePost/${objectId}` },
  { method: 'POST', path: `/api/post/unlikePost/${objectId}` },
  { method: 'GET', path: `/api/post/reposts/user/${objectId}` },
  { method: 'GET', path: `/api/post/reposts/${objectId}` },
  { method: 'POST', path: `/api/post/repostPost/${objectId}` },
  { method: 'DELETE', path: `/api/post/unrepostPost/${objectId}` },
  { method: 'POST', path: '/api/post/savePost' },
  { method: 'DELETE', path: `/api/post/unsavePost/${objectId}` },
  { method: 'GET', path: '/api/post/getSavedPostsCollections' },
  { method: 'POST', path: '/api/post/createCollection' },
  { method: 'PATCH', path: `/api/post/updateCollection/${objectId}` },
  { method: 'DELETE', path: `/api/post/deleteCollection/${objectId}` },
  { method: 'GET', path: `/api/post/savedCollections/${objectId}/posts` },
  { method: 'PATCH', path: '/api/post/changeSavedPostCollection' },
  { method: 'GET', path: '/api/post/feed' },

  { method: 'POST', path: '/api/problem/addProblemToRoom' },
  { method: 'PATCH', path: '/api/problem/selectProblem' },
  { method: 'PATCH', path: '/api/problem/unselectProblem' },
  { method: 'PATCH', path: '/api/problem/updateLanguage' },
  { method: 'POST', path: '/api/problem/run' },
  { method: 'GET', path: `/api/problem/${objectId}` },

  { method: 'GET', path: '/api/report/my-reports' },
  { method: 'POST', path: '/api/report' },

  { method: 'GET', path: '/api/search/discover' },
  { method: 'GET', path: '/api/search' },

  { method: 'POST', path: '/api/user/updatePassword' },
  { method: 'POST', path: '/api/user/verifyDeleteAccountPassword' },
  { method: 'POST', path: '/api/user/sendDeleteAccountOtp' },
  { method: 'POST', path: '/api/user/verifyDeleteAccountOtp' },
  { method: 'DELETE', path: '/api/user/deleteAccount' },
  { method: 'PATCH', path: '/api/user/updateUserNameAndPP' },
  { method: 'PATCH', path: '/api/user/updateGeneralInfo' },
  { method: 'PATCH', path: '/api/user/updateProfessionalInfo' },
  { method: 'GET', path: '/api/user/dashboardAnalytics' },
  { method: 'GET', path: `/api/user/getProfileUser/${objectId}` },
  { method: 'POST', path: `/api/user/trackProfileView/${objectId}` },
  { method: 'GET', path: '/api/user/getUserAccountHistory' },
  { method: 'GET', path: '/api/user/blockedUsers' },
  { method: 'GET', path: '/api/user/recommendations' },
  { method: 'POST', path: `/api/user/followUser/${objectId}` },
  { method: 'DELETE', path: `/api/user/unfollowUser/${objectId}` },
  { method: 'POST', path: `/api/user/blockUser/${objectId}` },
  { method: 'DELETE', path: `/api/user/unblockUser/${objectId}` },
  { method: 'GET', path: `/api/user/getFollowers/${objectId}` },
  { method: 'GET', path: `/api/user/getFollowing/${objectId}` },
];

const publicInvalidRequests: Endpoint[] = [
  { method: 'POST', path: '/api/auth/sendOtp' },
  { method: 'POST', path: '/api/auth/verifyAndRegister' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/google' },
  { method: 'POST', path: '/api/auth/sendOtpForForgotPassword' },
  { method: 'POST', path: '/api/auth/verifyOtpForForgotPassword' },
  { method: 'POST', path: '/api/auth/updateNewPassword_ForgotPassword' },
];

const publicEndpoints: Endpoint[] = [
  { method: 'GET', path: '/api/health' },
  { method: 'POST', path: '/api/auth/refresh' },
  { method: 'POST', path: '/api/auth/logout' },
  ...publicInvalidRequests,
];

const routeSources = [
  { basePath: '/api/health', file: 'src/modules/health/health.route.ts' },
  { basePath: '/api/issue', file: 'src/modules/issues/issue.route.ts' },
  { basePath: '/api/auth', file: 'src/modules/auth/auth.route.ts' },
  { basePath: '/api/chat', file: 'src/modules/chat/chat.route.ts' },
  { basePath: '/api/collab', file: 'src/modules/collab/collab.route.ts' },
  { basePath: '/api/comment', file: 'src/modules/comments/comment.route.ts' },
  { basePath: '/api/media', file: 'src/modules/media/media.route.ts' },
  { basePath: '/api/notification', file: 'src/modules/notifications/notification.route.ts' },
  { basePath: '/api/post', file: 'src/modules/posts/post.route.ts' },
  { basePath: '/api/problem', file: 'src/modules/problems/problem.route.ts' },
  { basePath: '/api/report', file: 'src/modules/reports/report.route.ts' },
  { basePath: '/api/search', file: 'src/modules/search/search.route.ts' },
  { basePath: '/api/user', file: 'src/modules/users/user.route.ts' },
];

const normalizeRoutePath = (basePath: string, routePath: string) => {
  if (routePath === '/') return basePath;
  return `${basePath}${routePath}`;
};

const routeKey = (endpoint: Endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`;
const routeShapeKey = (endpoint: Endpoint) => {
  const shapePath = endpoint.path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) return ':param';
      if (/^[a-f\d]{24}$/i.test(segment)) return ':param';
      if (segment === 'file-1') return ':param';
      return segment;
    })
    .join('/');

  return `${endpoint.method.toUpperCase()} ${shapePath}`;
};

const declaredEndpointsFromSource = () => routeSources.flatMap(({ basePath, file }) => {
  const source = readFileSync(join(process.cwd(), file), 'utf8');
  const matches = source.matchAll(/this\.router\.(get|post|patch|delete)\('([^']+)'/g);

  return Array.from(matches, ([, method, routePath]) => ({
    method: method.toUpperCase(),
    path: normalizeRoutePath(basePath, routePath),
  }));
});

describe('HTTP route contracts', () => {
  let client: TestHttpClient;

  before(async () => {
    app.set('trust proxy', 1);
    client = await createHttpClient(app);
  });

  after(async () => {
    await client.close();
  });

  it('serves the health endpoint without authentication', async () => {
    const response = await client.request<{ success: boolean }>('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
  });

  it('keeps the endpoint test matrix aligned with declared route files', () => {
    const declared = declaredEndpointsFromSource().map(routeShapeKey).sort();
    const expected = [...publicEndpoints, ...protectedEndpoints].map(routeShapeKey).sort();

    assert.deepEqual(expected, declared);
  });

  it('returns a not-found payload for unknown API paths', async () => {
    const response = await client.request<{ success: boolean; message: string }>('/api/missing-route');

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /not found/i);
  });

  it('validates every public auth payload before service work', async () => {
    for (const [index, endpoint] of publicInvalidRequests.entries()) {
      const response = await client.request<{ success: boolean; message: string }>(endpoint.path, {
        method: endpoint.method,
        headers: {
          'x-forwarded-for': `127.0.1.${index + 1}`,
        },
        body: {},
      });

      assert.equal(response.status, 422, `${endpoint.method} ${endpoint.path}`);
      assert.equal(response.body.success, false, `${endpoint.method} ${endpoint.path}`);
      assert.equal(response.body.message, 'Validation failed', `${endpoint.method} ${endpoint.path}`);
    }
  });

  it('rejects refresh without a refresh cookie', async () => {
    const response = await client.request<{ success: boolean; message: string }>('/api/auth/refresh', {
      method: 'POST',
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  it('allows logout without a refresh cookie and clears the session cookie', async () => {
    const response = await client.request<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.match(response.body.message, /logged out/i);
  });

  it('requires a bearer token for every protected API endpoint', async () => {
    for (const endpoint of protectedEndpoints) {
      const response = await client.request<{ success: boolean; message: string }>(endpoint.path, {
        method: endpoint.method,
      });

      assert.equal(response.status, 401, `${endpoint.method} ${endpoint.path}`);
      assert.equal(response.body.success, false, `${endpoint.method} ${endpoint.path}`);
      assert.match(response.body.message, /missing bearer token/i, `${endpoint.method} ${endpoint.path}`);
    }
  });
});
