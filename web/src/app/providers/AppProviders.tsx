import { GoogleOAuthProvider } from '@react-oauth/google';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import AuthInitializer from '@/app/auth/AuthInitializer';
import { router } from '@/app/router';
import { store } from '@/app/store/store';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import env from '@/shared/config/env';
import { ToastProvider } from './toast/ToastProvider';
import SocketLifecycle from './socket/SocketLifecycle';

const AppProviders = () => (
  <ErrorBoundary
    title="DevLoopFeed could not start."
    description="Try again or refresh the app to restart the session."
  >
    <Provider store={store}>
      <GoogleOAuthProvider clientId={env.googleClientId || 'missing-google-client-id'}>
        <ToastProvider>
          <AuthInitializer>
            <SocketLifecycle />
            <RouterProvider router={router} />
          </AuthInitializer>
        </ToastProvider>
      </GoogleOAuthProvider>
    </Provider>
  </ErrorBoundary>
);

export default AppProviders;
