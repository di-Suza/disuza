import type { Request, RequestHandler, Response } from 'express';

import authCookieService, { type AuthCookieService } from '../../shared/utils/authCookie.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import authService, { type AuthService } from './auth.service.js';

class AuthController {
  readonly refresh: RequestHandler;
  readonly sendOtp: RequestHandler;
  readonly verifyAndRegister: RequestHandler;
  readonly login: RequestHandler;
  readonly getMe: RequestHandler;
  readonly logout: RequestHandler;
  readonly logoutAllDevices: RequestHandler;
  readonly google: RequestHandler;
  readonly sendOtpForForgotPassword: RequestHandler;
  readonly verifyOtpForForgotPassword: RequestHandler;
  readonly updateNewPasswordForgotPassword: RequestHandler;

  constructor(
    private readonly service: AuthService = authService,
    private readonly cookies: AuthCookieService = authCookieService,
  ) {
    this.refresh = asyncHandler(this.handleRefresh.bind(this));
    this.sendOtp = asyncHandler(this.handleSendOtp.bind(this));
    this.verifyAndRegister = asyncHandler(this.handleVerifyAndRegister.bind(this));
    this.login = asyncHandler(this.handleLogin.bind(this));
    this.getMe = asyncHandler(this.handleGetMe.bind(this));
    this.logout = asyncHandler(this.handleLogout.bind(this));
    this.logoutAllDevices = asyncHandler(this.handleLogoutAllDevices.bind(this));
    this.google = asyncHandler(this.handleGoogle.bind(this));
    this.sendOtpForForgotPassword = asyncHandler(this.handleSendOtpForForgotPassword.bind(this));
    this.verifyOtpForForgotPassword = asyncHandler(this.handleVerifyOtpForForgotPassword.bind(this));
    this.updateNewPasswordForgotPassword = asyncHandler(this.handleUpdateNewPasswordForgotPassword.bind(this));
  }

  private async handleRefresh(req: Request, res: Response) {
    const refreshToken = this.cookies.getRefreshToken(req);
    const data = await this.service.refresh(refreshToken);
    this.cookies.setRefreshToken(res, data.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Session Renewed!',
      data: {
        accessToken: data.accessToken,
      },
    });
  }

  private async handleSendOtp(req: Request, res: Response) {
    const updatedOtpCount = await this.service.sendRegistrationOtp(req.body.email);

    res.status(201).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        email: req.body.email,
        remainingAttempts: 3 - updatedOtpCount,
        expiresIn: '10 minutes',
      },
    });
  }

  private async handleVerifyAndRegister(req: Request, res: Response) {
    const data = await this.service.verifyOtpAndRegister(req.body, req);
    this.cookies.setRefreshToken(res, data.refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account Created successfully',
      data: {
        user: data.user,
        accessToken: data.accessToken,
      },
    });
  }

  private async handleLogin(req: Request, res: Response) {
    const data = await this.service.loginUser(req.body, req);
    this.cookies.setRefreshToken(res, data.refreshToken);

    res.status(200).json({
      success: true,
      message: `Welcome back, ${data.user.userName}`,
      data: {
        user: data.user,
        accessToken: data.accessToken,
      },
    });
  }

  private async handleGetMe(req: Request, res: Response) {
    const user = await this.service.getMe(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'User Fetched Successfully',
      data: {
        user,
      },
    });
  }

  private async handleLogout(req: Request, res: Response) {
    const refreshToken = this.cookies.getRefreshToken(req);
    const data = await this.service.logout(refreshToken);
    this.cookies.clearRefreshToken(res);

    res.status(200).json({
      success: true,
      message: data.message,
    });
  }

  private async handleLogoutAllDevices(req: Request, res: Response) {
    const data = await this.service.logoutAllDevices(req.user!.id);
    this.cookies.clearRefreshToken(res);

    res.status(200).json({
      success: true,
      message: data.message,
    });
  }

  private async handleGoogle(req: Request, res: Response) {
    const data = await this.service.googleSign(req.body.code, req);
    this.cookies.setRefreshToken(res, data.refreshToken);

    res.status(data.user.isNew ? 201 : 200).json({
      success: true,
      message: data.user.isNew ? 'Account Created Successfully!' : `Welcome back, ${data.user.userName}`,
      data: {
        user: data.user,
        accessToken: data.accessToken,
      },
    });
  }

  private async handleSendOtpForForgotPassword(req: Request, res: Response) {
    const updatedOtpCount = await this.service.sendForgotPasswordOtp(req.body.email);

    res.status(201).json({
      success: true,
      message: `OTP sent on ${req.body.email}!`,
      data: {
        email: req.body.email,
        remainingAttempts: 3 - updatedOtpCount,
        expiresIn: '10 minutes',
      },
    });
  }

  private async handleVerifyOtpForForgotPassword(req: Request, res: Response) {
    const data = await this.service.verifyForgotPasswordOtp(req.body);

    res.status(200).json({
      success: true,
      message: 'OTP Verified!',
      data,
    });
  }

  private async handleUpdateNewPasswordForgotPassword(req: Request, res: Response) {
    const user = await this.service.updateForgotPassword(req.body.token, req.body.newPassword);

    res.status(200).json({
      success: true,
      message: 'Password Updated Successfully!',
      data: {
        user,
      },
    });
  }
}

const authController = new AuthController();

export { AuthController };
export default authController;