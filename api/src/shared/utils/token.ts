import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import env from '../../config/env.js';
import { TokenType, type TokenTypeValue } from '../constants/token.js';
import { UnauthorizedError } from '../errors/index.js';

type TokenSubject = {
  id: string;
  email?: string;
  role?: string;
};

type AppTokenPayload = JwtPayload & TokenSubject & {
  tokenType: TokenTypeValue;
};

class TokenService {
  private sign(payload: AppTokenPayload, secret: string, expiresIn: string): string {
    const options: SignOptions = {
      expiresIn: expiresIn as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, secret, options);
  }

  private verify(token: string, secret: string, tokenType: TokenTypeValue): AppTokenPayload {
    try {
      const payload = jwt.verify(token, secret) as AppTokenPayload;

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

  verifyAccessToken(token: string): AppTokenPayload {
    return this.verify(token, env.JWT_ACCESS_SECRET, TokenType.ACCESS);
  }

  verifyRefreshToken(token: string): AppTokenPayload {
    return this.verify(token, env.JWT_REFRESH_SECRET, TokenType.REFRESH);
  }
}

const tokenService = new TokenService();

export { TokenService, type AppTokenPayload, type TokenSubject };
export default tokenService;