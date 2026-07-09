import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type AccountDeletionVerificationMethod = 'password' | 'otp';

type AccountDeletionVerification = {
  user: Types.ObjectId;
  method: AccountDeletionVerificationMethod;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type AccountDeletionVerificationDocument = HydratedDocument<AccountDeletionVerification>;
type AccountDeletionVerificationModel = Model<AccountDeletionVerification>;

const accountDeletionVerificationSchema = new mongoose.Schema<AccountDeletionVerification, AccountDeletionVerificationModel>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    method: { type: String, enum: ['password', 'otp'], required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

accountDeletionVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AccountDeletionVerificationModel = mongoose.models.AccountDeletionVerification as AccountDeletionVerificationModel
  || mongoose.model<AccountDeletionVerification, AccountDeletionVerificationModel>(
    'AccountDeletionVerification',
    accountDeletionVerificationSchema,
    'accountdeletionverifications',
  );

export { type AccountDeletionVerification, type AccountDeletionVerificationDocument, type AccountDeletionVerificationMethod };
export default AccountDeletionVerificationModel;