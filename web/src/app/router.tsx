import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import ProtectedLayout from '@/app/layouts/ProtectedLayout';
import PublicLayout from '@/app/layouts/PublicLayout';
import SidebarLayout from '@/app/layouts/SidebarLayout';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import NotFound from '@/shared/components/NotFound/NotFound';

const DashboardPage = lazy(() => import('@/pages/dashboard'));
const CollabRoomPage = lazy(() => import('@/pages/collab'));
const FeedPage = lazy(() => import('@/pages/feed'));
const LandingPage = lazy(() => import('@/pages/landing'));
const MessagesPage = lazy(() => import('@/pages/messages'));
const NotificationsPage = lazy(() => import('@/pages/notifications'));
const PostDetailPage = lazy(() => import('@/pages/post-detail'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const SearchPage = lazy(() => import('@/pages/search'));
const SignInPage = lazy(() => import('@/pages/sign-in'));
const SignUpPage = lazy(() => import('@/pages/sign-up'));

const withSuspense = (element: ReactElement) => (
  <ErrorBoundary>
    <Suspense fallback={<FullPageLoader />}>
      {element}
    </Suspense>
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: withSuspense(<LandingPage />),
      },
      {
        path: '/auth/signin',
        element: withSuspense(<SignInPage />),
      },
      {
        path: '/auth/signup',
        element: withSuspense(<SignUpPage />),
      },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/collab/:roomId',
        element: withSuspense(<CollabRoomPage />),
      },
      {
        element: <SidebarLayout />,
        children: [
          {
            path: '/dashboard',
            element: withSuspense(<DashboardPage />),
          },
          {
            path: '/home',
            element: withSuspense(<FeedPage />),
          },
          {
            path: '/messages',
            element: withSuspense(<MessagesPage />),
          },
          {
            path: '/profile/:id',
            element: withSuspense(<ProfilePage />),
          },
          {
            path: '/post/:postId',
            element: withSuspense(<PostDetailPage />),
          },
          {
            path: '/notifications',
            element: withSuspense(<NotificationsPage />),
          },
          {
            path: '/search',
            element: withSuspense(<SearchPage />),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
