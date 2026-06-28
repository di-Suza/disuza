import { Resend } from 'resend';

import env from '../../config/env.js';
import { AppError } from '../errors/index.js';

class EmailService {
  private getClient(): Resend {
    if (!env.RESEND_API_KEY) {
      throw new AppError('Email service is not configured', 500);
    }

    return new Resend(env.RESEND_API_KEY);
  }

  async sendOtp(to: string, otp: string): Promise<void> {
    if (!env.SENDER_EMAIL) {
      throw new AppError('Sender email is not configured', 500);
    }

    await this.getClient().emails.send({
      from: env.SENDER_EMAIL,
      to,
      subject: 'OTP Verification',
      html: `<h1>Your OTP: ${otp}</h1>`,
    });
  }
}

const emailService = new EmailService();

export { EmailService };
export default emailService;