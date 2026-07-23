import { createHash } from 'node:crypto';

import logger from '../../config/logger.js';
import redisCache, { type RedisCache } from '../../infrastructure/cache/redis.js';
import type { Role } from '../../shared/constants/roles.js';
import tokenService from '../../shared/utils/token.js';

type CachedAuthUser = {
  id: string;
  userName: string;
  email: string;
  role: Role;
  active: boolean;
  profilePicture?: {
    url: string;
    fileId: string;
  };
};

const AUTH_USER_CACHE_TTL_SECONDS = 30 * 60;

class AuthCacheService {
  constructor(private readonly cache: RedisCache = redisCache) {}

  private getUserKey(userId: string) {
    return `user_:${userId}`;
  }

  private getAccessTokenBlacklistKey(accessToken: string) {
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    return `bl_access:${tokenHash}`;
  }

  private async runIfEnabled(action: () => Promise<void>) {
    if (!this.cache.isEnabled()) return;

    try {
      await action();
    } catch (error) {
      logger.warn({ error }, 'Auth cache operation failed');
    }
  }

  async getUser(userId: string): Promise<CachedAuthUser | null> {
    if (!this.cache.isEnabled()) return null;

    try {
      const cachedUser = await this.cache.getValue(this.getUserKey(userId));
      if (!cachedUser) return null;

      return JSON.parse(cachedUser) as CachedAuthUser;
    } catch (error) {
      logger.warn({ error, userId }, 'Auth user cache read failed');
      await this.invalidateUser(userId);
      return null;
    }
  }

  setUser(user: CachedAuthUser): Promise<void> {
    return this.runIfEnabled(() => (
      this.cache.setValue(this.getUserKey(user.id), JSON.stringify(user), AUTH_USER_CACHE_TTL_SECONDS)
    ));
  }

  invalidateUser(userId: string): Promise<void> {
    return this.runIfEnabled(() => this.cache.deleteKey(this.getUserKey(userId)));
  }

  async isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
    if (!this.cache.isEnabled()) return false;

    try {
      return this.cache.keyExists(this.getAccessTokenBlacklistKey(accessToken));
    } catch (error) {
      logger.warn({ error }, 'Access token blacklist lookup failed');
      return false;
    }
  }

  async blacklistAccessToken(accessToken: string): Promise<void> {
    if (!accessToken) return;

    await this.runIfEnabled(async () => {
      const expiresAt = tokenService.getExpiryDate(accessToken).getTime();
      const ttlSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
      await this.cache.setValue(this.getAccessTokenBlacklistKey(accessToken), '1', ttlSeconds);
    });
  }
}

const authCacheService = new AuthCacheService();

export { AuthCacheService, type CachedAuthUser };
export default authCacheService;
