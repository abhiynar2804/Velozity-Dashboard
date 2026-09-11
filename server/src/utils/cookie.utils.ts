import { Response, CookieOptions } from 'express';

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
};

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshTokenCookieOptions());
};

export const clearRefreshTokenCookie = (res: Response): void => {
  const options = getRefreshTokenCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...options,
    maxAge: 0,
  });
};
