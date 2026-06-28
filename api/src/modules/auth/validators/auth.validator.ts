import { body } from 'express-validator';

const emailRule = body('email')
  .isEmail()
  .withMessage('Invalid email address')
  .bail()
  .normalizeEmail();

const passwordRule = body('password')
  .isString()
  .withMessage('Password is required')
  .bail()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 chars');

const userNameRule = body('userName')
  .isString()
  .withMessage('Name is required')
  .bail()
  .trim()
  .isLength({ min: 3 })
  .withMessage('Name too short')
  .customSanitizer((value: string) => value.replace(/\s+/g, ' '));

const otpRule = body('otp')
  .isString()
  .withMessage('OTP is required')
  .bail()
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP must be 6 digits')
  .bail()
  .matches(/^\d+$/)
  .withMessage('OTP must be numeric');

const tokenRule = body('token')
  .isJWT()
  .withMessage('Token must be a valid JWT');

const sendOtpRules = [userNameRule, emailRule, passwordRule];
const verifyAndRegisterRules = [userNameRule, emailRule, passwordRule, otpRule];
const loginRules = [emailRule, passwordRule];
const emailRules = [emailRule];
const emailAndOtpRules = [emailRule, otpRule];
const newPasswordAndTokenRules = [tokenRule, body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 chars')];
const googleRules = [body('code').isString().trim().notEmpty().withMessage('Google code is required')];

export {
  emailAndOtpRules,
  emailRules,
  googleRules,
  loginRules,
  newPasswordAndTokenRules,
  sendOtpRules,
  verifyAndRegisterRules,
};