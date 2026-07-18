import mongoose, { type HydratedDocument, type Model } from 'mongoose';

type RevokedReason = 'LOGOUT' | 'LOGOUT_ALL' | 'ROTATED' | 'REUSED' | 'ACCOUNT_DELETED';

type AuthSession = {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
  rotatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuthSessionDocument = HydratedDocument<AuthSession>;

type AuthSessionModel = Model<AuthSession>;

const authSessionSchema = new mongoose.Schema<AuthSession, AuthSessionModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedReason: {
      type: String,
      enum: ['LOGOUT', 'LOGOUT_ALL', 'ROTATED', 'REUSED', 'ACCOUNT_DELETED', null],
      default: null,
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ userId: 1, revokedAt: 1 });

const AuthSessionModel = mongoose.models.AuthSession as AuthSessionModel
  || mongoose.model<AuthSession, AuthSessionModel>('AuthSession', authSessionSchema, 'auth_sessions');

export { type AuthSession, type AuthSessionDocument, type RevokedReason };
export default AuthSessionModel;