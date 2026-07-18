import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { body } from 'express-validator';

import userRepository from '../src/modules/users/user.repository.js';
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../src/shared/errors/index.js';
import { authenticate, authorize } from '../src/shared/middleware/auth.js';
import { normalizeError } from '../src/shared/middleware/errorHandler.js';
import notFoundHandler from '../src/shared/middleware/notFoundHandler.js';
import validateRequest from '../src/shared/middleware/validateRequest.js';
import { TokenType } from '../src/shared/constants/token.js';
import tokenService from '../src/shared/utils/token.js';
import { oid, userId } from './helpers/domain.js';

const invokeMiddleware = async (middleware: (...args: never[]) => unknown, req: Record<string, unknown>) => {
  let nextError: unknown;
  let nextCalled = false;
  await middleware(req as never, {} as never, ((error?: unknown) => {
    nextCalled = true;
    nextError = error;
  }) as never);
  return { nextCalled, nextError };
};

describe('shared middleware', () => {
  it('normalizes framework, database, upload, app, and unknown errors', () => {
    assert.deepEqual(normalizeError(new AppError('Nope', 418, { reason: 'test' })), {
      statusCode: 418,
      message: 'Nope',
      details: { reason: 'test' },
    });
    assert.equal(normalizeError({ name: 'MulterError', code: 'LIMIT_FILE_SIZE', field: 'media' }).message, 'File is too large.');
    assert.equal(normalizeError({ name: 'CastError' }).message, 'Invalid resource id');
    assert.equal(normalizeError({ name: 'ValidationError', message: 'Bad model', errors: { name: 'required' } }).statusCode, 400);
    assert.equal(normalizeError({ name: 'MongoServerError', code: 11000, keyValue: { email: 'samar@example.com' } }).statusCode, 409);
    assert.equal(normalizeError(new Error('boom')).statusCode, 500);
  });

  it('converts express-validator failures to ValidationError details', async () => {
    const req = { body: { email: 'bad' } };
    await body('email').isEmail().withMessage('Invalid email').run(req as never);

    const { nextError } = await invokeMiddleware(validateRequest as never, req);

    assert.ok(nextError instanceof ValidationError);
    assert.equal((nextError as ValidationError).message, 'Validation failed');
    assert.equal(((nextError as ValidationError).details as Array<{ field: string }>)[0].field, 'email');
  });

  it('passes validateRequest with no validation failures and maps not-found routes', async () => {
    const valid = await invokeMiddleware(validateRequest as never, { body: {}, query: {}, params: {} });
    assert.equal(valid.nextError, undefined);

    const missing = await invokeMiddleware(notFoundHandler as never, { method: 'GET', originalUrl: '/api/missing' });
    assert.ok(missing.nextError instanceof NotFoundError);
  });

  it('authorizes allowed roles and rejects missing or forbidden users', async () => {
    assert.ok((await invokeMiddleware(authorize('ADMIN') as never, {})).nextError instanceof UnauthorizedError);
    assert.ok((await invokeMiddleware(authorize('ADMIN') as never, { user: { role: 'USER' } })).nextError instanceof ForbiddenError);
    assert.equal((await invokeMiddleware(authorize('USER') as never, { user: { role: 'USER' } })).nextError, undefined);
  });

  it('authenticates bearer tokens and rejects missing, invalid, or inactive users', async () => {
    const mutableTokenService = tokenService as unknown as {
      verifyAccessToken: typeof tokenService.verifyAccessToken;
    };
    const mutableUserRepository = userRepository as unknown as {
      findPublicById: (id: string) => Promise<unknown>;
    };
    const originalVerify = mutableTokenService.verifyAccessToken;
    const originalFindPublicById = mutableUserRepository.findPublicById;

    mutableTokenService.verifyAccessToken = () => ({
      id: userId,
      email: 'samar@example.com',
      role: 'USER',
      tokenType: TokenType.ACCESS,
    });
    mutableUserRepository.findPublicById = async () => ({
      _id: oid(userId),
      userName: 'Samar',
      email: 'samar@example.com',
      role: 'USER',
      active: true,
      profilePicture: { url: 'pp.jpg', fileId: 'file-1' },
    }) as never;

    try {
      const missing = await invokeMiddleware(authenticate as never, { headers: {} });
      assert.ok(missing.nextError instanceof UnauthorizedError);

      const validReq = { headers: { authorization: 'Bearer token' } };
      const valid = await invokeMiddleware(authenticate as never, validReq);
      assert.equal(valid.nextError, undefined);
      assert.equal((validReq as { user?: { id: string } }).user?.id, userId);

      mutableUserRepository.findPublicById = async () => ({ _id: oid(userId), active: false });
      const inactive = await invokeMiddleware(authenticate as never, { headers: { authorization: 'Bearer token' } });
      assert.ok(inactive.nextError instanceof UnauthorizedError);
    } finally {
      mutableTokenService.verifyAccessToken = originalVerify;
      mutableUserRepository.findPublicById = originalFindPublicById;
    }
  });
});
