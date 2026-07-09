import type { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';

import env from '../../config/env.js';
import heatmapService, { type HeatmapService } from '../contributions/heatmap.service.js';
import { Roles } from '../../shared/constants/roles.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../shared/errors/index.js';
import passwordService from '../../shared/utils/password.js';
import tokenService from '../../shared/utils/token.js';
import type { UserDocument } from '../users/user.model.js';
import authRepository, { type AuthRepository } from './auth.repository.js';
import otpService, { type OtpService } from './otp.service.js';
import authSessionService, { type AuthSessionService } from './session/authSession.service.js';

type RegisterPayload = {
  userName: string;
  email: string;
  password: string;
  otp: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type ForgotPasswordOtpPayload = {
  email: string;
  otp: string;
};

class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly repository: AuthRepository = authRepository,
    private readonly sessions: AuthSessionService = authSessionService,
    private readonly otps: OtpService = otpService,
    private readonly heatmap: HeatmapService = heatmapService,
  ) {
    this.googleClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      'postmessage',
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async sanitizeUser(user: UserDocument) {
    const [plainUser, heatmap] = await Promise.all([
      Promise.resolve(user.toObject()),
      this.heatmap.getHeatmap(user._id),
    ]);

    return {
      ...plainUser,
      heatmap,
    };
  }

  private getTokenSubject(user: UserDocument) {
    return {
      id: String(user._id),
      email: user.email,
      role: user.role,
    };
  }

  private async createSessionTokens(user: UserDocument, req: Request | null) {
    const subject = this.getTokenSubject(user);
    const accessToken = tokenService.signAccessToken(subject);
    const { refreshToken } = await this.sessions.createSession(subject, req);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async getOtpWindowCount(email: string): Promise<number> {
    const otpData = await this.repository.otps.findByEmail(email);

    if (!otpData) return 0;

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - otpData.lastResendTime.getTime()) / (1000 * 60));

    if (diffInMinutes >= 10) {
      return 0;
    }

    if (otpData.otpCount >= 3) {
      throw new TooManyRequestsError(`Too many requests. Please try again after ${10 - diffInMinutes} minutes.`);
    }

    return otpData.otpCount;
  }

  async sendRegistrationOtp(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const userExists = await this.repository.users.findByEmail(email);

    if (userExists) {
      if (userExists.isGoogleUser && !userExists.password) {
        throw new BadRequestError('This email is already registered via Google. Please login with Google!');
      }

      throw new ConflictError('User already exists! Please login');
    }

    const currentCount = await this.getOtpWindowCount(email);
    const updatedOtpRecord = await this.otps.sendAndSaveOtp(email, currentCount);

    return updatedOtpRecord.otpCount;
  }

  async verifyOtpAndRegister(payload: RegisterPayload, req: Request | null) {
    const email = this.normalizeEmail(payload.email);
    const userExists = await this.repository.users.findByEmail(email);

    if (userExists) {
      if (userExists.isGoogleUser && !userExists.password) {
        throw new ConflictError('This email is already registered via Google. Please login with Google!');
      }

      throw new ConflictError('User already exists! Please login');
    }

    const { otpMatched, verifyAttempts } = await this.otps.verifyOtp(email, payload.otp);

    if (!otpMatched) {
      await this.repository.otps.incrementVerifyAttempts(email, verifyAttempts + 1);
      throw new UnauthorizedError('OTP not matched!');
    }

    const passwordHash = await passwordService.hash(payload.password);
    const user = await this.repository.users.create({
      userName: payload.userName,
      email,
      password: passwordHash,
      role: Roles.USER,
    });

    await this.repository.otps.deleteByEmail(email);
    const { accessToken, refreshToken } = await this.createSessionTokens(user, req);

    return {
      user: await this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async loginUser(payload: LoginPayload, req: Request | null) {
    const email = this.normalizeEmail(payload.email);
    const user = await this.repository.users.findByEmailWithSecrets(email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.active === false) {
      throw new UnauthorizedError('Account no longer exists');
    }

    if (user.isGoogleUser && !user.password) {
      throw new UnauthorizedError('This account is linked with Google. Please use Google Login!');
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new ForbiddenError(`Account is locked due to too many failed attempts. Try again in ${remainingTime} minutes.`);
    }

    const isPasswordValid = await passwordService.compare(payload.password, user.password || '');

    if (!isPasswordValid) {
      await this.repository.users.incrementFailedLogin(user);

      if (user.loginAttempts === 0 && user.lockUntil && user.lockUntil > Date.now()) {
        throw new ForbiddenError('Too many failed attempts. Your account has been locked for 15 minutes.');
      }

      throw new UnauthorizedError('Invalid email or password');
    }

    await this.repository.users.updateLoginSuccess(user);
    const { accessToken, refreshToken } = await this.createSessionTokens(user, req);

    return {
      user: await this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string | null) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const { payload } = await this.sessions.assertValidRefreshSession(refreshToken);
    const user = await this.repository.users.findById(payload.id);

    if (!user || user.active === false) {
      throw new UnauthorizedError('Account no longer exists');
    }

    const subject = this.getTokenSubject(user);
    const accessToken = tokenService.signAccessToken(subject);
    const nextRefreshToken = await this.sessions.rotateSession(refreshToken, subject);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async getMe(userId: string) {
    const user = await this.repository.users.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }

  async logout(refreshToken: string | null) {
    if (refreshToken) {
      await this.sessions.revokeSession(refreshToken, 'LOGOUT');
    }

    return {
      message: 'Logged out successfully!',
    };
  }

  async logoutAllDevices(userId: string) {
    await this.sessions.revokeAllUserSessions(userId, 'LOGOUT_ALL');

    return {
      message: 'Logged out from all devices successfully!',
    };
  }

  async googleSign(code: string, req: Request | null) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestError('Google OAuth is not configured');
    }

    const { tokens } = await this.googleClient.getToken(code);

    if (!tokens.id_token) {
      throw new UnauthorizedError('Google identity token is missing');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      throw new BadRequestError('Google email not verified');
    }

    const email = this.normalizeEmail(payload.email);
    let user = await this.repository.users.findByEmail(email);
    let isNew = false;

    if (user) {
      if (user.active === false) {
        throw new UnauthorizedError('Account no longer exists');
      }

      user = await this.repository.users.markGoogleLogin(user);
    } else {
      user = await this.repository.users.create({
        userName: payload.name || email.split('@')[0],
        email,
        profilePicture: {
          url: payload.picture || 'https://ik.imagekit.io/disuza/DevloopFeed/ProfilePictures/defaultpp.jpg',
          fileId: '0',
        },
        isGoogleUser: true,
        role: Roles.USER,
      });
      isNew = true;
    }

    const { accessToken, refreshToken } = await this.createSessionTokens(user, req);

    return {
      user: {
        ...(await this.sanitizeUser(user)),
        isNew,
      },
      accessToken,
      refreshToken,
    };
  }

  async sendForgotPasswordOtp(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const user = await this.repository.users.findByEmail(email);

    if (!user) {
      throw new NotFoundError("User didn't exist with this email, Register first!");
    }

    const currentCount = await this.getOtpWindowCount(email);
    const updatedOtpRecord = await this.otps.sendAndSaveOtp(email, currentCount);

    return updatedOtpRecord.otpCount;
  }

  async verifyForgotPasswordOtp(payload: ForgotPasswordOtpPayload) {
    const email = this.normalizeEmail(payload.email);
    const user = await this.repository.users.findByEmail(email);

    if (!user) {
      throw new NotFoundError("User doesn't exists with this email!");
    }

    const { otpMatched, verifyAttempts } = await this.otps.verifyOtp(email, payload.otp);

    if (!otpMatched) {
      await this.repository.otps.incrementVerifyAttempts(email, verifyAttempts + 1);
      throw new UnauthorizedError('OTP not matched!');
    }

    await this.repository.otps.deleteByEmail(email);
    const token = tokenService.signPasswordResetToken({
      id: String(user._id),
      email,
    });

    return {
      token,
      email,
    };
  }

  async updateForgotPassword(token: string, newPassword: string) {
    const payload = tokenService.verifyPasswordResetToken(token);

    if (payload.purpose !== 'forgot-password') {
      throw new BadRequestError('Bad Request');
    }

    const user = await this.repository.users.findByEmail(payload.email || '');

    if (!user || String(user._id) !== payload.id) {
      throw new NotFoundError('User Not Found!');
    }

    const passwordHash = await passwordService.hash(newPassword);
    const updatedUser = await this.repository.users.updatePassword(user._id, passwordHash);

    if (!updatedUser) {
      throw new NotFoundError('User Not Found!');
    }

    await this.sessions.revokeAllUserSessions(String(user._id), 'LOGOUT_ALL');

    return this.sanitizeUser(updatedUser);
  }
}

const authService = new AuthService();

export { AuthService };
export default authService;