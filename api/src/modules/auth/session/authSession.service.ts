import crypto from 'node:crypto';
import type { Request } from 'express';
import mongoose from 'mongoose';

import { UnauthorizedError } from '../../../shared/errors/index.js';
import tokenService, { type TokenSubject } from '../../../shared/utils/token.js';
import authSessionRepository, { type AuthSessionRepository } from './authSession.repository.js';

class AuthSessionService {
  constructor(private readonly repository: AuthSessionRepository = authSessionRepository) {}

  hashRefreshToken(refreshToken: string): string {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
  }

  getRequestMeta(req: Request | null) {
    return {
      userAgent: req?.headers['user-agent'] || null,
      ipAddress: req?.ip || req?.socket.remoteAddress || null,
    };
  }

  async createSession(subject: TokenSubject, req: Request | null) {
    const sessionId = new mongoose.Types.ObjectId();
    const refreshToken = tokenService.signRefreshToken({
      ...subject,
      sessionId: sessionId.toString(),
    });
    const { userAgent, ipAddress } = this.getRequestMeta(req);

    await this.repository.create({
      _id: sessionId,
      userId: subject.id,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: tokenService.getExpiryDate(refreshToken),
    });

    return {
      sessionId: sessionId.toString(),
      refreshToken,
    };
  }

  async rotateSession(refreshToken: string, subject: TokenSubject) {
    const payload = tokenService.verifyRefreshToken(refreshToken);

    if (!payload.sessionId) {
      throw new UnauthorizedError('Refresh session is invalid');
    }

    const session = await this.repository.findActiveByIdAndHash(
      payload.sessionId,
      this.hashRefreshToken(refreshToken),
    );

    if (!session) {
      throw new UnauthorizedError('Refresh session is invalid or expired');
    }

    const nextRefreshToken = tokenService.signRefreshToken({
      ...subject,
      sessionId: payload.sessionId,
      rotationId: crypto.randomUUID(),
    });

    await this.repository.updateRefreshToken(
      payload.sessionId,
      this.hashRefreshToken(nextRefreshToken),
      tokenService.getExpiryDate(nextRefreshToken),
    );

    return nextRefreshToken;
  }

  async assertValidRefreshSession(refreshToken: string) {
    const payload = tokenService.verifyRefreshToken(refreshToken);

    if (!payload.sessionId) {
      throw new UnauthorizedError('Refresh session is invalid');
    }

    const session = await this.repository.findActiveByIdAndHash(
      payload.sessionId,
      this.hashRefreshToken(refreshToken),
    );

    if (!session) {
      throw new UnauthorizedError('Refresh session is invalid or expired');
    }

    return {
      payload,
      session,
    };
  }

  async revokeSession(refreshToken: string, reason: 'LOGOUT' | 'LOGOUT_ALL' | 'REUSED' = 'LOGOUT') {
    if (!refreshToken) return null;

    try {
      const payload = tokenService.verifyRefreshToken(refreshToken);
      if (!payload.sessionId) return null;

      return this.repository.revokeByIdAndHash(
        payload.sessionId,
        this.hashRefreshToken(refreshToken),
        reason,
      );
    } catch (_error) {
      return null;
    }
  }

  revokeAllUserSessions(userId: string, reason: 'LOGOUT_ALL' = 'LOGOUT_ALL') {
    return this.repository.revokeAllByUserId(userId, reason);
  }
}

const authSessionService = new AuthSessionService();

export { AuthSessionService };
export default authSessionService;
