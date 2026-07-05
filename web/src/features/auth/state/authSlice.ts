import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AuthPayload, AuthState, AuthUser } from '../model/auth.types';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
  isLoggedOut: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading: (state) => {
      state.status = 'loading';
    },
    setCredentials: (state, action: PayloadAction<AuthPayload>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
      state.isLoggedOut = false;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.isLoggedOut = false;
      if (state.user) {
        state.status = 'authenticated';
      }
    },
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.status = 'authenticated';
      state.isLoggedOut = false;
    },
    clearSession: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
      state.isLoggedOut = true;
    },
    markUnauthenticated: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
    },
  },
});

export const {
  clearSession,
  markUnauthenticated,
  setAccessToken,
  setAuthLoading,
  setCredentials,
  setUser,
} = authSlice.actions;

export default authSlice.reducer;

