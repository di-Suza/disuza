import type { CookieOptions, Request, Response } from 'express';

import env from '../../config/env.js';

class AuthCookieService {
  private getOptions(): CookieOptions {
    const options: CookieOptions = {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: env.REFRESH_COOKIE_MAX_AGE_MS,
      path: '/',
    };

    if (env.COOKIE_DOMAIN) {
      options.domain = env.COOKIE_DOMAIN;
    }

    return options;
  }

  getRefreshToken(req: Request): string | null {
    const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
    return typeof token === 'string' ? token : null;
  }

  setRefreshToken(res: Response, refreshToken: string): void {
    res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, this.getOptions());
  }

  clearRefreshToken(res: Response): void {
    const options = this.getOptions();
    delete options.maxAge;
    res.clearCookie(env.REFRESH_COOKIE_NAME, options);
  }
}

const authCookieService = new AuthCookieService();

export { AuthCookieService };
export default authCookieService;