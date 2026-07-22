import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const stringToBoolean = (value: unknown) => {
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (normalized === '') return undefined;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return value;
};

const optionalString = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(emptyStringToUndefined, z.string().trim().email().optional());
const optionalBoolean = z.preprocess(stringToBoolean, z.boolean().optional());

const DEVELOPMENT_JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCpt7S1hv6Jq4JH
nlBBOG6nE9JbspvVbb4Yh+24SeLiKB1QwQTSpBQSJvjRXF719BLxsm3uK+OZ1BmB
8czLRBinDUOrbgth5HLDPZwbtH3gpq9qe/2tmqI+dEr5W41oF/EucNR6/06kLKmk
QWXDIi/ntuigEGd89BaMiBiLZWYDcmzX+MF8mQmYfz9KWXREE8pJa/cpfr7+3urU
8wx3o5csZXfGlRQocRPd5M9/1UbBS4TNm4y1SW6CyRAZnZQAIfuSkUexKSBmb4ya
Rbw+hMMWmHYjKWy1EMBLF/FKzbHDNAZONGX01SocdEuF+uoANQiRib9zevnv8TaO
wr4PjZndAgMBAAECggEABvKxYDkdlI9D7yCpEnJ3/TkPhJeET7GFdcWi0seblTyl
LpgoVWNIOxIDX7bTYGhUmjZ+z6BWWgbX4H0AsFWiWLxvR8ZiiuhqVlngWTYDbT4F
smtPEFtjRwFFzH2WBWvtgMQ3vq1TD9+QNlxDCUEOCwNu9JaXVgM8JRaxQoutKHjm
oM489ngC7wXDdgFR51r/AJDsIEB+35IyLFQftRpLUQvJGju76ZeZLbgIyOliBryo
CKyxjw+8h3fqKg2jrQXlYCw+qVZripNsUDaVOChmuppudE6V/B8FSMjhQTWt9GHZ
O0ozVo/HcGsNr0r2oTIAaRoSUyJtm5nPV3swgyEfoQKBgQDjAFKl6TIi+3JOfBPR
pjzgPGsoktQqnfLu/0d7cxjkez0y6AhlbtvVixxZyW3pVuzxdFqddwPYMk4cIdcZ
9cIyQtjKzRuunbgw1Kv2uzwMxi4XgB5dGvSwYBGp3c9zqImazftrVe3+0lQtdsAg
uhXzr+SwpdFZjnG0XQBmcrdrRQKBgQC/ZgWLnyP54lnlF3oG7ecZzOQdxE+i+IfS
X824yM+9J7/GWLJ0A2LKXPjiA6ykfRnl8mvx18Ru+83neLNS880wo9FoObpZW6jd
qsx9yPk95jPhw0oyvi0aVkGHQA8FIpqeJ0EHhkZMYUOylqhtFlp3uNs2km7gBTD8
riFgdLORuQKBgDnNaz40E0A1JvY1Qhawbe/rcp3yRXRUo/eXqWwV8tC7UOoVi43I
nNHTinSShhpUuCEDr89I7wGuTZV8SHmjyr9hpjJ95/6eyrgkb2V0Z+YY0MPLK/Ap
XQVMcTL/+ENLNz7kFJFQYDny9Nxe0K2EtPJIZ8NTdeuICgwTYnaz32DBAoGADYWR
ormNexvoqeysrEymZQY6n3e9AJB6V/x4tjNJqd1jCQo/IT8T/aPv2VfVHJHSAJLN
2Xoa4JRdiZrXYGbk+ii4pJpfdeyp0287ny9RnHPk+nAnj8oruY6adomqBfzZ245+
Y5+y27aLZ9SI9Zv8rDSdGA/kUWNMgK10ojHcddECgYAx+Hbt4gzZug2Cdevz1ZY3
gm9tbzqRVXGonbuoWGKPXVid4GDHcvyZ/fVdOcgSgGTkyXJzqzpT4vxT9dPi/oKr
LHFEU5vXpe4c96Ng42hQIOGuWiXvLw7Nb/X+4ktcFQ6JfOHUX5851lOSVEHytEZM
ajB/TefzwIzpl7W57rEDVw==
-----END PRIVATE KEY-----`;

const DEVELOPMENT_JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqbe0tYb+iauCR55QQThu
pxPSW7Kb1W2+GIftuEni4igdUMEE0qQUEib40Vxe9fQS8bJt7ivjmdQZgfHMy0QY
pw1Dq24LYeRywz2cG7R94Kavanv9rZqiPnRK+VuNaBfxLnDUev9OpCyppEFlwyIv
57booBBnfPQWjIgYi2VmA3Js1/jBfJkJmH8/Sll0RBPKSWv3KX6+/t7q1PMMd6OX
LGV3xpUUKHET3eTPf9VGwUuEzZuMtUlugskQGZ2UACH7kpFHsSkgZm+MmkW8PoTD
Fph2IylstRDASxfxSs2xwzQGTjRl9NUqHHRLhfrqADUIkYm/c3r57/E2jsK+D42Z
3QIDAQAB
-----END PUBLIC KEY-----`;

const pickFirstString = (...values: Array<string | undefined>) => values.find((value) => typeof value === 'string' && value.trim().length > 0);

const normalizePemKey = (value: string): string => {
  const normalized = value.trim().replace(/\\n/g, '\n');

  if (normalized.includes('-----BEGIN ')) {
    return normalized;
  }

  try {
    const decoded = Buffer.from(normalized, 'base64').toString('utf8').trim().replace(/\\n/g, '\n');
    if (decoded.includes('-----BEGIN ')) {
      return decoded;
    }
  } catch (_error) {
    // Fall through and let validation surface a clear configuration error.
  }

  return normalized;
};

const isPrivatePemKey = (value: string) => value.includes('-----BEGIN PRIVATE KEY-----') || value.includes('-----BEGIN RSA PRIVATE KEY-----');
const isPublicPemKey = (value: string) => value.includes('-----BEGIN PUBLIC KEY-----') || value.includes('-----BEGIN RSA PUBLIC KEY-----');

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  MONGODB_URI: z.string().trim().min(1).default('mongodb://localhost:27017/disuza'),
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
  REDIS_ENABLED: optionalBoolean,
  JOB_WORKERS_ENABLED: optionalBoolean,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JWT_PRIVATE_KEY: optionalString,
  JWT_PUBLIC_KEY: optionalString,
  JWT_PRIVATE_KEY_BS64: optionalString,
  JWT_PUBLIC_KEY_BS64: optionalString,
  PRIVATE_JWT_KEY_BS64: optionalString,
  PUBLIC_JWT_KEY_BS64: optionalString,
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
  PISTON_API_URL: z.string().trim().min(1).default('https://emkc.org/api/v2/piston'),
  PISTON_RUN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30_000).default(5000),
  PISTON_COMPILE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30_000).default(10_000),
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
const redisEnabled = parsedEnv.REDIS_ENABLED ?? parsedEnv.NODE_ENV === 'production';
const configuredJwtPrivateKey = pickFirstString(
  parsedEnv.JWT_PRIVATE_KEY,
  parsedEnv.JWT_PRIVATE_KEY_BS64,
  parsedEnv.PRIVATE_JWT_KEY_BS64,
);
const configuredJwtPublicKey = pickFirstString(
  parsedEnv.JWT_PUBLIC_KEY,
  parsedEnv.JWT_PUBLIC_KEY_BS64,
  parsedEnv.PUBLIC_JWT_KEY_BS64,
);
const derivedEnv = {
  ...parsedEnv,
  REDIS_ENABLED: redisEnabled,
  JOB_WORKERS_ENABLED: parsedEnv.JOB_WORKERS_ENABLED ?? redisEnabled,
  COOKIE_SECURE: parsedEnv.COOKIE_SECURE ?? (parsedEnv.NODE_ENV === 'production'),
  SOCKET_CORS_ORIGIN: parsedEnv.SOCKET_CORS_ORIGIN ?? parsedEnv.CORS_ORIGIN,
  IMAGEKIT_PUBLIC_KEY: parsedEnv.IMAGEKIT_PUBLIC_KEY ?? parsedEnv.IMAGE_KIT_PUBLIC,
  IMAGEKIT_PRIVATE_KEY: parsedEnv.IMAGEKIT_PRIVATE_KEY ?? parsedEnv.IMAGE_KIT_PRIVATE,
  IMAGEKIT_URL_ENDPOINT: parsedEnv.IMAGEKIT_URL_ENDPOINT ?? parsedEnv.IMAGE_KIT_URL_ENDPOINT,
  JWT_PRIVATE_KEY: normalizePemKey(configuredJwtPrivateKey ?? DEVELOPMENT_JWT_PRIVATE_KEY),
  JWT_PUBLIC_KEY: normalizePemKey(configuredJwtPublicKey ?? DEVELOPMENT_JWT_PUBLIC_KEY),
};

const validationErrors: string[] = [];

if (derivedEnv.NODE_ENV === 'production' && derivedEnv.CORS_ORIGIN === '*') {
  validationErrors.push('CORS_ORIGIN must be restricted in production');
}

if (derivedEnv.NODE_ENV === 'production' && !configuredJwtPrivateKey) {
  validationErrors.push('JWT_PRIVATE_KEY or PRIVATE_JWT_KEY_BS64 must be configured in production');
}

if (derivedEnv.NODE_ENV === 'production' && !configuredJwtPublicKey) {
  validationErrors.push('JWT_PUBLIC_KEY or PUBLIC_JWT_KEY_BS64 must be configured in production');
}

if (!isPrivatePemKey(derivedEnv.JWT_PRIVATE_KEY)) {
  validationErrors.push('JWT private key must be a PEM private key or base64 encoded PEM private key');
}

if (!isPublicPemKey(derivedEnv.JWT_PUBLIC_KEY)) {
  validationErrors.push('JWT public key must be a PEM public key or base64 encoded PEM public key');
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
