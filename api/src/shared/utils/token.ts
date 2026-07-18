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
  private sign(payload: AppTokenPayload, secret: string, expiresIn: string): string {
    const options: SignOptions = {
      expiresIn: expiresIn as SignOptions['expiresIn'],
      issuer: 'Disuza',
    };

    return jwt.sign(payload, secret, options);
  }

  private verify(token: string, secret: string, tokenType: TokenTypeValue): AppTokenPayload {
    try {
      const payload = jwt.verify(token, secret, {
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
      env.JWT_ACCESS_SECRET,
      env.ACCESS_TOKEN_EXPIRES_IN,
    );
  }

  signRefreshToken(subject: TokenSubject): string {
    return this.sign(
      {
        ...subject,
        tokenType: TokenType.REFRESH,
      },
      env.JWT_REFRESH_SECRET,
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
      env.JWT_ACCESS_SECRET,
      '5m',
    );
  }

  verifyAccessToken(token: string): AppTokenPayload {
    return this.verify(token, env.JWT_ACCESS_SECRET, TokenType.ACCESS);
  }

  verifyRefreshToken(token: string): AppTokenPayload {
    return this.verify(token, env.JWT_REFRESH_SECRET, TokenType.REFRESH);
  }

  verifyPasswordResetToken(token: string): AppTokenPayload {
    return this.verify(token, env.JWT_ACCESS_SECRET, TokenType.PASSWORD_RESET);
  }
}

const tokenService = new TokenService();

export { TokenService, type AppTokenPayload, type TokenSubject };
export default tokenService;
