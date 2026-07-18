import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import env from '../../config/env.js';
import { TokenType, type TokenTypeValue } from '../constants/token.js';
import { UnauthorizedError } from '../errors/index.js';

type TokenSubject = {
  id: string;
  email?: string;
  role?: string;
  sessionId?: string;
  purpose?: string;
  rotationId?: string;
};

type AppTokenPayload = JwtPayload & TokenSubject & {
  tokenType: TokenTypeValue;
};

class TokenService {
  private sign(payload: AppTokenPayload, expiresIn: string): string {
    const options: SignOptions = {
      algorithm: 'RS256',
      expiresIn: expiresIn as SignOptions['expiresIn'],
      issuer: 'Disuza',
    };

    return jwt.sign(payload, env.JWT_PRIVATE_KEY, options);
  }

  private verify(token: string, tokenType: TokenTypeValue): AppTokenPayload {
    try {
      const payload = jwt.verify(token, env.JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'Disuza',
      }) as AppTokenPayload;

      if (payload.tokenType !== tokenType) {
        throw new UnauthorizedError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  getExpiryDate(token: string): Date {
    const decoded = jwt.decode(token) as JwtPayload | null;

    if (!decoded?.exp) {
      throw new UnauthorizedError('Invalid token expiry');
    }

    return new Date(decoded.exp * 1000);
  }

  signAccessToken(subject: TokenSubject): string {
    return this.sign(
      {
        ...subject,
        tokenType: TokenType.ACCESS,
      },
      env.ACCESS_TOKEN_EXPIRES_IN,
    );
  }

  signRefreshToken(subject: TokenSubject): string {
    return this.sign(
      {
        ...subject,
        tokenType: TokenType.REFRESH,
      },
      env.REFRESH_TOKEN_EXPIRES_IN,
    );
  }

  signPasswordResetToken(subject: TokenSubject): string {
    return this.sign(
      {
        ...subject,
        tokenType: TokenType.PASSWORD_RESET,
        purpose: 'forgot-password',
      },
      '5m',
    );
  }

  verifyAccessToken(token: string): AppTokenPayload {
    return this.verify(token, TokenType.ACCESS);
  }

  verifyRefreshToken(token: string): AppTokenPayload {
    return this.verify(token, TokenType.REFRESH);
  }

  verifyPasswordResetToken(token: string): AppTokenPayload {
    return this.verify(token, TokenType.PASSWORD_RESET);
  }
}

const tokenService = new TokenService();

export { TokenService, type AppTokenPayload, type TokenSubject };
export default tokenService;
