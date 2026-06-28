import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    MONGODB_URI: z.string().trim().min(1).default('mongodb://localhost:27017/devloopfeed'),
    CORS_ORIGIN: z.string().trim().min(1).default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    JWT_ACCESS_SECRET: z.string().trim().min(32).default('devloopfeed_access_secret_change_me_32_chars'),
    JWT_REFRESH_SECRET: z.string().trim().min(32).default('devloopfeed_refresh_secret_change_me_32_chars'),
    ACCESS_TOKEN_EXPIRES_IN: z.string().trim().min(1).default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().trim().min(1).default('7d'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && value.CORS_ORIGIN === '*') {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'CORS_ORIGIN must be restricted in production',
      });
    }

    if (
      value.NODE_ENV === 'production'
      && value.JWT_ACCESS_SECRET === 'devloopfeed_access_secret_change_me_32_chars'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET must be configured in production',
      });
    }

    if (
      value.NODE_ENV === 'production'
      && value.JWT_REFRESH_SECRET === 'devloopfeed_refresh_secret_change_me_32_chars'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be configured in production',
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

const env = Object.freeze(result.data);

export default env;