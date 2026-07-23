import type { RequestHandler } from 'express';

import authCacheService from '../../modules/auth/authCache.service.js';
import userRepository from '../../modules/users/user.repository.js';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';
import tokenService from '../utils/token.js';

const buildAuthUser = (user: Awaited<ReturnType<typeof userRepository.findPublicById>>) => {
  if (!user) return null;

  return {
    id: String(user._id),
    userName: user.userName,
    email: user.email,
    role: user.role,
    active: user.active,
    profilePicture: user.profilePicture,
  };
};

const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Missing bearer token');
    }

    const payload = tokenService.verifyAccessToken(token);
    const isBlacklisted = await authCacheService.isAccessTokenBlacklisted(token);

    if (isBlacklisted) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const cachedUser = await authCacheService.getUser(payload.id);

    if (cachedUser) {
      if (cachedUser.active === false) {
        throw new UnauthorizedError('Account no longer exists');
      }

      req.user = cachedUser;
      return next();
    }

    const user = await userRepository.findPublicById(payload.id);
    const authUser = buildAuthUser(user);

    if (!authUser || authUser.active === false) {
      throw new UnauthorizedError('Account no longer exists');
    }

    await authCacheService.setUser(authUser);
    req.user = authUser;

    return next();
  } catch (error) {
    return next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Invalid or expired token'));
  }
};

function authorize(...allowedRoles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }

    return next();
  };
}

export { authenticate, authorize };
