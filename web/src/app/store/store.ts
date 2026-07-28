import { configureStore } from '@reduxjs/toolkit';

import authReducer from '@/features/auth/state/authSlice';
import chatReducer from '@/features/messages/state/chatSlice';
import postUploadReducer from '@/features/posts/state/postUploadSlice';
import { api } from '@/shared/api/api';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    chat: chatReducer,
    postUploads: postUploadReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

