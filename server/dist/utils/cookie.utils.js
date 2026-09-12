"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearRefreshTokenCookie = exports.setRefreshTokenCookie = exports.getRefreshTokenCookieOptions = exports.REFRESH_COOKIE_NAME = void 0;
exports.REFRESH_COOKIE_NAME = 'refreshToken';
const getRefreshTokenCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        path: '/',
    };
};
exports.getRefreshTokenCookieOptions = getRefreshTokenCookieOptions;
const setRefreshTokenCookie = (res, token) => {
    res.cookie(exports.REFRESH_COOKIE_NAME, token, (0, exports.getRefreshTokenCookieOptions)());
};
exports.setRefreshTokenCookie = setRefreshTokenCookie;
const clearRefreshTokenCookie = (res) => {
    const options = (0, exports.getRefreshTokenCookieOptions)();
    res.clearCookie(exports.REFRESH_COOKIE_NAME, {
        ...options,
        maxAge: 0,
    });
};
exports.clearRefreshTokenCookie = clearRefreshTokenCookie;
