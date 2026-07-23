import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import jwt from 'jsonwebtoken';

import { AuthService } from '../../src/modules/auth/auth.service.js';
import { OtpService } from '../../src/modules/auth/otp.service.js';
import { AuthSessionService } from '../../src/modules/auth/session/authSession.service.js';
import { TokenType } from '../../src/shared/constants/token.js';
import { AppError, TooManyRequestsError, UnauthorizedError } from '../../src/shared/errors/index.js';
import emailService from '../../src/shared/utils/email.js';
import tokenService from '../../src/shared/utils/token.js';
import { userId } from '../helpers/domain.js';

describe('AuthService and AuthSessionService', () => {
  it('signs and verifies JWTs with RS256 keys', () => {
    const token = tokenService.signAccessToken({
      id: userId,
      email: 'samar@example.com',
      role: 'USER',
    });
    const decoded = jwt.decode(token, { complete: true }) as { header?: { alg?: string } } | null;
    const payload = tokenService.verifyAccessToken(token);

    assert.equal(decoded?.header?.alg, 'RS256');
    assert.equal(payload.id, userId);
    assert.equal(payload.email, 'samar@example.com');
    assert.equal(payload.tokenType, TokenType.ACCESS);
  });

  it('rejects missing refresh tokens and allows no-token logout', async () => {
    const service = new AuthService({} as never, {} as never, {} as never, {} as never);

    await assert.rejects(() => service.refresh(null), UnauthorizedError);
    assert.deepEqual(await service.logout(null), { message: 'Logged out successfully!' });
  });

  it('blacklists access tokens during logout flows', async () => {
    const calls: string[] = [];
    const sessions = {
      revokeSession: async (token: string, reason: string) => calls.push(`refresh:${token}:${reason}`),
      revokeAllUserSessions: async (id: string, reason: string) => calls.push(`all:${id}:${reason}`),
    };
    const authCache = {
      blacklistAccessToken: async (token: string) => calls.push(`access:${token}`),
      invalidateUser: async (id: string) => calls.push(`user:${id}`),
    };
    const service = new AuthService({} as never, sessions as never, {} as never, {} as never, authCache as never);

    assert.deepEqual(await service.logout('refresh-token', 'Bearer access-token'), { message: 'Logged out successfully!' });
    assert.deepEqual(await service.logoutAllDevices(userId, 'Bearer second-access-token'), {
      message: 'Logged out from all devices successfully!',
    });

    assert.deepEqual(calls, [
      'refresh:refresh-token:LOGOUT',
      'access:access-token',
      `all:${userId}:LOGOUT_ALL`,
      `user:${userId}`,
      'access:second-access-token',
    ]);
  });

  it('creates, rotates, validates, and revokes refresh sessions through the repository', async () => {
    let storedHash = '';
    let sessionId = '';
    const repository = {
      create: async (record: { _id: { toString: () => string }; refreshTokenHash: string }) => {
        sessionId = record._id.toString();
        storedHash = record.refreshTokenHash;
        return record;
      },
      findActiveByIdAndHash: async (id: string, hash: string) => (id === sessionId && hash === storedHash ? { _id: id } : null),
      updateRefreshToken: async (id: string, hash: string) => {
        assert.equal(id, sessionId);
        storedHash = hash;
        return { _id: id };
      },
      revokeByIdAndHash: async (id: string, hash: string, reason: string) => ({ id, hash, reason }),
      revokeAllByUserId: async (id: string, reason: string) => ({ id, reason }),
    };
    const service = new AuthSessionService(repository as never);
    const subject = { id: userId, email: 'samar@example.com', role: 'USER' };

    const created = await service.createSession(subject, null);
    const validated = await service.assertValidRefreshSession(created.refreshToken);
    const rotatedToken = await service.rotateSession(created.refreshToken, subject);
    const revoked = await service.revokeSession(rotatedToken, 'LOGOUT');

    assert.equal(created.sessionId, sessionId);
    assert.equal(validated.payload.sessionId, sessionId);
    assert.notEqual(rotatedToken, created.refreshToken);
    assert.equal((revoked as { reason?: string } | null)?.reason, 'LOGOUT');
    await assert.rejects(() => service.assertValidRefreshSession('bad-token'), UnauthorizedError);
  });
});

describe('OtpService', () => {
  it('rejects expired OTP records and locks out excessive verification attempts', async () => {
    const missingService = new OtpService({
      findByEmail: async () => null,
    } as never);
    await assert.rejects(() => missingService.verifyOtp('samar@example.com', '123456'), AppError);

    let deletedEmail = '';
    const lockedService = new OtpService({
      findByEmail: async () => ({ otp: 'hash', verifyAttempts: 4 }),
      deleteByEmail: async (email: string) => {
        deletedEmail = email;
      },
    } as never);
    await assert.rejects(() => lockedService.verifyOtp('samar@example.com', '123456'), TooManyRequestsError);
    assert.equal(deletedEmail, 'samar@example.com');
  });

  it('rolls OTP count back when delivery fails', async () => {
    let decrementedEmail = '';
    const originalSendOtp = emailService.sendOtp;
    emailService.sendOtp = async () => {
      throw new AppError('Email delivery failed', 500);
    };
    const service = new OtpService({
      upsertOtp: async () => ({ _id: 'otp-record' }),
      decrementOtpCount: async (email: string) => {
        decrementedEmail = email;
      },
    } as never);

    try {
      await assert.rejects(() => service.sendAndSaveOtp('samar@example.com', 1), AppError);
      assert.equal(decrementedEmail, 'samar@example.com');
    } finally {
      emailService.sendOtp = originalSendOtp;
    }
  });
});
