import type { Types } from 'mongoose';

import AuthSessionModel, { type AuthSessionDocument, type RevokedReason } from './authSession.model.js';

type CreateSessionInput = {
  _id: Types.ObjectId;
  userId: Types.ObjectId | string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
};

class AuthSessionRepository {
  create(data: CreateSessionInput): Promise<AuthSessionDocument> {
    return AuthSessionModel.create(data);
  }

  findActiveByIdAndHash(sessionId: string, refreshTokenHash: string): Promise<AuthSessionDocument | null> {
    return AuthSessionModel.findOne({
      _id: sessionId,
      refreshTokenHash,
      expiresAt: { $gt: new Date() },
      revokedAt: null,
    });
  }

  updateRefreshToken(sessionId: string, refreshTokenHash: string, expiresAt: Date): Promise<AuthSessionDocument | null> {
    return AuthSessionModel.findOneAndUpdate(
      { _id: sessionId, revokedAt: null },
      {
        refreshTokenHash,
        expiresAt,
        rotatedAt: new Date(),
      },
      { new: true },
    );
  }

  revokeBySessionId(sessionId: string, reason: RevokedReason): Promise<AuthSessionDocument | null> {
    return AuthSessionModel.findOneAndUpdate(
      { _id: sessionId, revokedAt: null },
      {
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { new: true },
    );
  }

  revokeByIdAndHash(sessionId: string, refreshTokenHash: string, reason: RevokedReason): Promise<AuthSessionDocument | null> {
    return AuthSessionModel.findOneAndUpdate(
      {
        _id: sessionId,
        refreshTokenHash,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { new: true },
    );
  }

  revokeAllByUserId(userId: string | Types.ObjectId, reason: RevokedReason): Promise<unknown> {
    return AuthSessionModel.updateMany(
      {
        userId,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );
  }
}

const authSessionRepository = new AuthSessionRepository();

export { AuthSessionRepository, type CreateSessionInput };
export default authSessionRepository;