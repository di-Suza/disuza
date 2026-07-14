import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const optionalString = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(emptyStringToUndefined, z.string().trim().email().optional());

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  MONGODB_URI: z.string().trim().min(1).default('mongodb://localhost:27017/devloopfeed'),
  CORS_ORIGIN: z.string().trim().min(1).default('http://localhost:5173'),
  SOCKET_CORS_ORIGIN: optionalString,
  SOCKET_PING_TIMEOUT_MS: z.coerce.number().int().min(10_000).default(60_000),
  SOCKET_PING_INTERVAL_MS: z.coerce.number().int().min(5_000).default(25_000),
  REDIS_URL: optionalString,
  REDIS_HOST: z.string().trim().min(1).default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_USERNAME: optionalString,
  REDIS_PASSWORD: optionalString,
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  JOB_WORKERS_ENABLED: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JWT_ACCESS_SECRET: z.string().trim().min(32).default('devloopfeed_access_secret_change_me_32_chars'),
  JWT_REFRESH_SECRET: z.string().trim().min(32).default('devloopfeed_refresh_secret_change_me_32_chars'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().trim().min(1).default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().trim().min(1).default('7d'),
  REFRESH_COOKIE_NAME: z.string().trim().min(1).default('refreshToken'),
  REFRESH_COOKIE_MAX_AGE_MS: z.coerce.number().int().min(1000).default(7 * 24 * 60 * 60 * 1000),
  COOKIE_SECURE: z.coerce.boolean().optional(),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_DOMAIN: optionalString,
  RESEND_API_KEY: optionalString,
  SENDER_EMAIL: optionalEmail,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  IMAGEKIT_PUBLIC_KEY: optionalString,
  IMAGEKIT_PRIVATE_KEY: optionalString,
  IMAGEKIT_URL_ENDPOINT: optionalString,
  IMAGE_KIT_PUBLIC: optionalString,
  IMAGE_KIT_PRIVATE: optionalString,
  IMAGE_KIT_URL_ENDPOINT: optionalString,
  MEDIA_MAX_FILE_SIZE_BYTES: z.coerce.number().int().min(1024).max(25 * 1024 * 1024).default(5 * 1024 * 1024),
  MEDIA_MAX_VIDEO_FILE_SIZE_BYTES: z.coerce.number().int().min(1024).max(100 * 1024 * 1024).default(50 * 1024 * 1024),
  MEDIA_POST_IMAGE_MAX_COUNT: z.coerce.number().int().min(1).max(10).default(5),
  MEDIA_POST_MEDIA_MAX_COUNT: z.coerce.number().int().min(1).max(10).default(5),
  JUDGE0_API_URL: z.string().trim().min(1).default('https://judge029.p.rapidapi.com'),
  RAPIDAPI_JUDGE0_HOST: z.string().trim().min(1).default('judge029.p.rapidapi.com'),
  RAPIDAPI_JUDGE0_KEY: optionalString,
  PROBLEM_RUN_LOCK_TTL_SECONDS: z.coerce.number().int().min(5).max(300).default(60),
});

const result = rawEnvSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

const parsedEnv = result.data;
const derivedEnv = {
  ...parsedEnv,
  COOKIE_SECURE: parsedEnv.COOKIE_SECURE ?? (parsedEnv.NODE_ENV === 'production'),
  SOCKET_CORS_ORIGIN: parsedEnv.SOCKET_CORS_ORIGIN ?? parsedEnv.CORS_ORIGIN,
  IMAGEKIT_PUBLIC_KEY: parsedEnv.IMAGEKIT_PUBLIC_KEY ?? parsedEnv.IMAGE_KIT_PUBLIC,
  IMAGEKIT_PRIVATE_KEY: parsedEnv.IMAGEKIT_PRIVATE_KEY ?? parsedEnv.IMAGE_KIT_PRIVATE,
  IMAGEKIT_URL_ENDPOINT: parsedEnv.IMAGEKIT_URL_ENDPOINT ?? parsedEnv.IMAGE_KIT_URL_ENDPOINT,
};

const validationErrors: string[] = [];

if (derivedEnv.NODE_ENV === 'production' && derivedEnv.CORS_ORIGIN === '*') {
  validationErrors.push('CORS_ORIGIN must be restricted in production');
}

if (
  derivedEnv.NODE_ENV === 'production'
  && derivedEnv.JWT_ACCESS_SECRET === 'devloopfeed_access_secret_change_me_32_chars'
) {
  validationErrors.push('JWT_ACCESS_SECRET must be configured in production');
}

if (
  derivedEnv.NODE_ENV === 'production'
  && derivedEnv.JWT_REFRESH_SECRET === 'devloopfeed_refresh_secret_change_me_32_chars'
) {
  validationErrors.push('JWT_REFRESH_SECRET must be configured in production');
}

if (derivedEnv.COOKIE_SAME_SITE === 'none' && !derivedEnv.COOKIE_SECURE) {
  validationErrors.push('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none');
}

if (derivedEnv.NODE_ENV === 'production' && !derivedEnv.RESEND_API_KEY) {
  validationErrors.push('RESEND_API_KEY must be configured in production');
}

if (derivedEnv.NODE_ENV === 'production' && !derivedEnv.SENDER_EMAIL) {
  validationErrors.push('SENDER_EMAIL must be configured in production');
}

if (derivedEnv.NODE_ENV === 'production' && !derivedEnv.IMAGEKIT_PRIVATE_KEY) {
  validationErrors.push('IMAGEKIT_PRIVATE_KEY must be configured in production');
}

if (derivedEnv.NODE_ENV === 'production' && !derivedEnv.IMAGEKIT_URL_ENDPOINT) {
  validationErrors.push('IMAGEKIT_URL_ENDPOINT must be configured in production');
}

if (validationErrors.length > 0) {
  throw new Error(`Invalid environment configuration: ${validationErrors.join('; ')}`);
}

const env = Object.freeze(derivedEnv);

export default env;
