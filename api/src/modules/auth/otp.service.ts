import crypto from 'node:crypto';

import { AppError, TooManyRequestsError, UnauthorizedError } from '../../shared/errors/index.js';
import emailService from '../../shared/utils/email.js';
import passwordService from '../../shared/utils/password.js';
import otpRepository, { type OtpRepository } from './otp.repository.js';

class OtpService {
  constructor(private readonly repository: OtpRepository = otpRepository) {}

  async sendAndSaveOtp(email: string, currentCount: number) {
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await passwordService.hash(rawOtp);
    const updatedOtpRecord = await this.repository.upsertOtp(email, hashedOtp, currentCount + 1);

    if (!updatedOtpRecord) {
      throw new AppError('OTP could not be saved', 500);
    }

    try {
      await emailService.sendOtp(email, rawOtp);
    } catch (error) {
      await this.repository.decrementOtpCount(email);
      throw error instanceof AppError ? error : new AppError('Email delivery failed', 500);
    }

    return updatedOtpRecord;
  }

  async verifyOtp(email: string, otp: string) {
    const otpRecord = await this.repository.findByEmail(email);

    if (!otpRecord) {
      throw new AppError('OTP Expired', 410);
    }

    if (otpRecord.verifyAttempts > 3) {
      await this.repository.deleteByEmail(email);
      throw new TooManyRequestsError('Too many requests. Please try again with new OTP after 10 minutes');
    }

    const otpMatched = await passwordService.compare(otp, otpRecord.otp);

    return {
      otpMatched,
      verifyAttempts: otpRecord.verifyAttempts,
    };
  }
}

const otpService = new OtpService();

export { OtpService };
export default otpService;