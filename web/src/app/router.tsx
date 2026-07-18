import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, useLocation } from 'react-router-dom';

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

const RouteBoundary = ({ children, name }: { children: ReactElement; name: string }) => {
  const location = useLocation();

  return (
    <ErrorBoundary
      resetKeys={[location.pathname, location.search]}
      title={`${name} could not be loaded.`}
      description="Try again or refresh the page if this keeps happening."
    >
      <Suspense fallback={<FullPageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

const withSuspense = (element: ReactElement, name: string) => <RouteBoundary name={name}>{element}</RouteBoundary>;

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: withSuspense(<LandingPage />, 'Landing page'),
      },
      {
        path: '/auth/signin',
        element: withSuspense(<SignInPage />, 'Sign in page'),
      },
      {
        path: '/auth/signup',
        element: withSuspense(<SignUpPage />, 'Sign up page'),
      },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/collab/:roomId',
        element: withSuspense(<CollabRoomPage />, 'Collaboration room'),
      },
      {
        element: <SidebarLayout />,
        children: [
          {
            path: '/dashboard',
            element: withSuspense(<DashboardPage />, 'Dashboard'),
          },
          {
            path: '/home',
            element: withSuspense(<FeedPage />, 'Feed'),
          },
          {
            path: '/messages',
            element: withSuspense(<MessagesPage />, 'Messages'),
          },
          {
            path: '/profile/:id',
            element: withSuspense(<ProfilePage />, 'Profile'),
          },
          {
            path: '/post/:postId',
            element: withSuspense(<PostDetailPage />, 'Post detail'),
          },
          {
            path: '/notifications',
            element: withSuspense(<NotificationsPage />, 'Notifications'),
          },
          {
            path: '/search',
            element: withSuspense(<SearchPage />, 'Search'),
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
