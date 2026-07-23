import { Redis, type RedisOptions } from 'ioredis';

import env from '../../config/env.js';
import logger from '../../config/logger.js';

class RedisCache {
  private client?: Redis;

  private buildOptions(): RedisOptions {
    return {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      username: env.REDIS_USERNAME,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
      retryStrategy: (attempt) => Math.min(attempt * 50, 2000),
      maxRetriesPerRequest: null,
    };
  }

  getConnectionOptions(): RedisOptions {
    this.assertEnabled();
    return this.buildOptions();
  }

  isEnabled(): boolean {
    return env.REDIS_ENABLED;
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new Error('Redis is disabled. Set REDIS_ENABLED=true to enable Redis-backed jobs and locks.');
    }
  }

  getConnection(): Redis {
    this.assertEnabled();

    if (!this.client) {
      this.client = env.REDIS_URL
        ? new Redis(env.REDIS_URL, this.buildOptions())
        : new Redis(this.buildOptions());

      this.client.on('connect', () => {
        logger.info('Redis connected');
      });

      this.client.on('error', (error: Error) => {
        logger.error({ error }, 'Redis connection error');
      });
    }

    return this.client;
  }

  async acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.getConnection().set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async getValue(key: string): Promise<string | null> {
    return this.getConnection().get(key);
  }

  async setValue(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.getConnection().setex(key, ttlSeconds, value);
  }

  async keyExists(key: string): Promise<boolean> {
    return (await this.getConnection().exists(key)) === 1;
  }

  async releaseLock(key: string): Promise<void> {
    await this.getConnection().del(key);
  }

  async deleteKey(key: string): Promise<void> {
    await this.getConnection().del(key);
  }
}

const redisCache = new RedisCache();

export { RedisCache };
export default redisCache;
