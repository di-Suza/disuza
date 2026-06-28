import mongoose, { type HydratedDocument, type Model } from 'mongoose';

type Otp = {
  email: string;
  otp: string;
  otpCount: number;
  verifyAttempts: number;
  lastResendTime: Date;
  createdAt: Date;
  updatedAt: Date;
};

type OtpDocument = HydratedDocument<Otp>;

type OtpModel = Model<Otp>;

const otpSchema = new mongoose.Schema<Otp, OtpModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpCount: {
      type: Number,
      default: 1,
    },
    verifyAttempts: {
      type: Number,
      default: 0,
    },
    lastResendTime: {
      type: Date,
      default: Date.now,
      index: { expires: '10m' },
    },
  },
  { timestamps: true },
);

const OtpModel = mongoose.models.Otp as OtpModel || mongoose.model<Otp, OtpModel>('Otp', otpSchema, 'otps');

export { type Otp, type OtpDocument };
export default OtpModel;