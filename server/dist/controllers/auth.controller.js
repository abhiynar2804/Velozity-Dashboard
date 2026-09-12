"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const cookie_utils_1 = require("../utils/cookie.utils");
const ApiResponse_1 = require("../utils/ApiResponse");
const prisma_1 = __importDefault(require("../utils/prisma"));
class AuthController {
    /**
     * Register new user
     */
    async register(req, res, next) {
        try {
            const result = await auth_service_1.authService.register(req.body);
            // Set HttpOnly cookie for refresh token
            (0, cookie_utils_1.setRefreshTokenCookie)(res, result.refreshToken);
            res.status(201).json(ApiResponse_1.ApiResponse.success('User registered successfully', {
                user: result.user,
                accessToken: result.accessToken,
            }, 201));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    /**
     * User login
     */
    async login(req, res, next) {
        try {
            const result = await auth_service_1.authService.login(req.body);
            // Set HttpOnly cookie for refresh token
            (0, cookie_utils_1.setRefreshTokenCookie)(res, result.refreshToken);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Login successful', {
                user: result.user,
                accessToken: result.accessToken,
            }, 200));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    /**
     * Refresh token
     */
    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies?.[cookie_utils_1.REFRESH_COOKIE_NAME] ||
                req.body?.refreshToken ||
                req.headers['x-refresh-token'];
            if (!refreshToken) {
                res.status(401).json(ApiResponse_1.ApiResponse.error('Refresh token missing from cookie or header', 401));
                return;
            }
            const result = await auth_service_1.authService.refresh(refreshToken);
            // Set rotated refresh token in HttpOnly cookie
            (0, cookie_utils_1.setRefreshTokenCookie)(res, result.refreshToken);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Token refreshed successfully', {
                accessToken: result.accessToken,
                user: result.user,
            }, 200));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    /**
     * Logout user
     */
    async logout(req, res, next) {
        try {
            const refreshToken = req.cookies?.[cookie_utils_1.REFRESH_COOKIE_NAME] ||
                req.body?.refreshToken ||
                req.headers['x-refresh-token'];
            if (refreshToken) {
                await auth_service_1.authService.logout(refreshToken);
            }
            // Invalidate HttpOnly cookie
            (0, cookie_utils_1.clearRefreshTokenCookie)(res);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Logged out successfully', null, 200));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    /**
     * Get current authenticated user profile
     */
    async getMe(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json(ApiResponse_1.ApiResponse.error('Not authenticated', 401));
                return;
            }
            const user = await prisma_1.default.user.findUnique({
                where: { id: req.user.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!user) {
                res.status(404).json(ApiResponse_1.ApiResponse.error('User not found', 404));
                return;
            }
            res.status(200).json(ApiResponse_1.ApiResponse.success('User profile fetched successfully', user, 200));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
