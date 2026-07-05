export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export type ProfilePicture = {
  url: string;
  fileId?: string;
};

export type AuthUser = {
  _id: string;
  userName: string;
  email: string;
  role?: string;
  profilePicture?: ProfilePicture;
  headline?: string;
  about?: string;
  isGoogleUser?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  isLoggedOut: boolean;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiResult<T> = T & {
  message: string;
};

export type AuthPayload = {
  user: AuthUser;
  accessToken: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SendOtpRequest = {
  userName: string;
  email: string;
  password: string;
};

export type VerifyAndRegisterRequest = SendOtpRequest & {
  otp: string;
};

export type OtpResponse = {
  email: string;
  remainingAttempts: number;
  expiresIn: string;
};

export type GoogleLoginRequest = {
  code: string;
};

export type ForgotPasswordOtpRequest = {
  email: string;
  otp: string;
};

export type ForgotPasswordTokenResponse = {
  token: string;
  email: string;
};

export type UpdateForgotPasswordRequest = {
  token: string;
  newPassword: string;
};
