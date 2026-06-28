import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import { authRateLimiter } from '../../shared/middleware/rateLimiter.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import authController from './auth.controller.js';
import {
  emailAndOtpRules,
  emailRules,
  googleRules,
  loginRules,
  newPasswordAndTokenRules,
  sendOtpRules,
  verifyAndRegisterRules,
} from './validators/auth.validator.js';

class AuthRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.post('/refresh', authController.refresh);
    this.router.post('/sendOtp', authRateLimiter, sendOtpRules, validateRequest, authController.sendOtp);
    this.router.post('/verifyAndRegister', authRateLimiter, verifyAndRegisterRules, validateRequest, authController.verifyAndRegister);
    this.router.post('/login', authRateLimiter, loginRules, validateRequest, authController.login);
    this.router.get('/me', authenticate, authController.getMe);
    this.router.post('/logout', authController.logout);
    this.router.post('/logoutAllDevices', authenticate, authController.logoutAllDevices);
    this.router.post('/google', authRateLimiter, googleRules, validateRequest, authController.google);
    this.router.post('/sendOtpForForgotPassword', authRateLimiter, emailRules, validateRequest, authController.sendOtpForForgotPassword);
    this.router.post('/verifyOtpForForgotPassword', authRateLimiter, emailAndOtpRules, validateRequest, authController.verifyOtpForForgotPassword);
    this.router.post('/updateNewPassword_ForgotPassword', authRateLimiter, newPasswordAndTokenRules, validateRequest, authController.updateNewPasswordForgotPassword);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { AuthRoutes };
export default new AuthRoutes().getRouter();