import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import ProtectedLayout from '@/app/layouts/ProtectedLayout';
import PublicLayout from '@/app/layouts/PublicLayout';
import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import NotFound from '@/shared/components/NotFound/NotFound';

const DashboardPage = lazy(() => import('@/features/dashboard/ui/pages/DashboardPage'));
const FeedPage = lazy(() => import('@/features/posts/ui/pages/FeedPage'));
const LandingPage = lazy(() => import('@/features/landing/ui/pages/LandingPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/ui/pages/NotificationsPage'));
const ProfilePage = lazy(() => import('@/features/profile/ui/pages/ProfilePage'));
const SearchPage = lazy(() => import('@/features/search/ui/pages/SearchPage'));
const SignInPage = lazy(() => import('@/features/auth/ui/pages/SignIn/SignIn'));
const SignUpPage = lazy(() => import('@/features/auth/ui/pages/SignUp/SignUp'));

const withSuspense = (element: ReactElement) => (
  <Suspense fallback={<FullPageLoader />}>
    {element}
  </Suspense>
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
        path: '/dashboard',
        element: withSuspense(<DashboardPage />),
      },
      {
        path: '/home',
        element: withSuspense(<FeedPage />),
      },
      {
        path: '/profile/:id',
        element: withSuspense(<ProfilePage />),
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
  {
    path: '*',
    element: <NotFound />,
  },
]);
