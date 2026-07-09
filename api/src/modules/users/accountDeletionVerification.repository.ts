import type { Types } from 'mongoose';

import AccountDeletionVerificationModel, { type AccountDeletionVerificationMethod } from './accountDeletionVerification.model.js';

const VERIFICATION_TTL_MS = 10 * 60 * 1000;

class AccountDeletionVerificationRepository {
  upsert(userId: string | Types.ObjectId, method: AccountDeletionVerificationMethod) {
    return AccountDeletionVerificationModel.findOneAndUpdate(
      { user: userId },
      { method, expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  findValid(userId: string | Types.ObjectId) {
    return AccountDeletionVerificationModel.findOne({ user: userId, expiresAt: { $gt: new Date() } }).lean();
  }

  deleteByUser(userId: string | Types.ObjectId) {
    return AccountDeletionVerificationModel.deleteOne({ user: userId });
  }
}

const accountDeletionVerificationRepository = new AccountDeletionVerificationRepository();

export { AccountDeletionVerificationRepository, VERIFICATION_TTL_MS };
export default accountDeletionVerificationRepository;