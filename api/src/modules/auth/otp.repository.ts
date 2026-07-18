import OtpModel, { type OtpDocument } from './otp.model.js';

class OtpRepository {
  findByEmail(email: string): Promise<OtpDocument | null> {
    return OtpModel.findOne({ email: email.toLowerCase() });
  }

  upsertOtp(email: string, otp: string, otpCount: number): Promise<OtpDocument | null> {
    return OtpModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          otp,
          lastResendTime: new Date(),
          otpCount,
          verifyAttempts: 0,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  incrementVerifyAttempts(email: string, nextAttempts: number): Promise<unknown> {
    return OtpModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { verifyAttempts: nextAttempts } },
    );
  }

  decrementOtpCount(email: string): Promise<unknown> {
    return OtpModel.updateOne({ email: email.toLowerCase() }, { $inc: { otpCount: -1 } });
  }

  deleteByEmail(email: string): Promise<unknown> {
    return OtpModel.deleteOne({ email: email.toLowerCase() });
  }
}

const otpRepository = new OtpRepository();

export { OtpRepository };
export default otpRepository;