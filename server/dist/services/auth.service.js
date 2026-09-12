"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = exports.AppError = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const password_utils_1 = require("../utils/password.utils");
const token_utils_1 = require("../utils/token.utils");
const client_1 = require("@prisma/client");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
class AuthService {
    /**
     * Register a new user
     */
    async register(input) {
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email: input.email.toLowerCase() },
        });
        if (existingUser) {
            throw new AppError("Email is already registered", 409);
        }
        const passwordHash = await (0, password_utils_1.hashPassword)(input.password);
        const user = await prisma_1.default.user.create({
            data: {
                name: input.name,
                email: input.email.toLowerCase(),
                passwordHash,
                role: client_1.UserRole.DEVELOPER,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        const accessToken = (0, token_utils_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        const refreshToken = (0, token_utils_1.generateRefreshToken)({
            userId: user.id,
        });
        const tokenHash = (0, token_utils_1.hashToken)(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await prisma_1.default.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });
        return {
            user,
            accessToken,
            refreshToken,
        };
    }
    /**
     * Login user with email and password
     */
    async login(input) {
        const user = await prisma_1.default.user.findUnique({
            where: { email: input.email.toLowerCase() },
        });
        if (!user) {
            throw new AppError("Invalid email or password", 401);
        }
        const isPasswordValid = await (0, password_utils_1.comparePassword)(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new AppError("Invalid email or password", 401);
        }
        const accessToken = (0, token_utils_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        const refreshToken = (0, token_utils_1.generateRefreshToken)({
            userId: user.id,
        });
        const tokenHash = (0, token_utils_1.hashToken)(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await prisma_1.default.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
            accessToken,
            refreshToken,
        };
    }
    /**
     * Refresh access and refresh tokens
     */
    async refresh(refreshTokenString) {
        if (!refreshTokenString) {
            throw new AppError("Refresh token required", 401);
        }
        let payload;
        try {
            payload = (0, token_utils_1.verifyRefreshToken)(refreshTokenString);
        }
        catch (err) {
            throw new AppError("Invalid or expired refresh token", 401);
        }
        const incomingTokenHash = (0, token_utils_1.hashToken)(refreshTokenString);
        const storedToken = await prisma_1.default.refreshToken.findUnique({
            where: { tokenHash: incomingTokenHash },
            include: { user: true },
        });
        if (!storedToken) {
            throw new AppError("Refresh token not recognized or already used", 401);
        }
        if (storedToken.revokedAt) {
            // Possible token reuse attempt: invalidate all tokens for this user for security
            await prisma_1.default.refreshToken.updateMany({
                where: { userId: storedToken.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new AppError("Refresh token has been revoked", 403);
        }
        if (new Date() > storedToken.expiresAt) {
            throw new AppError("Refresh token has expired", 401);
        }
        // Invalidate old token (Rotation)
        await prisma_1.default.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
        });
        const user = storedToken.user;
        const newAccessToken = (0, token_utils_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        const newRefreshToken = (0, token_utils_1.generateRefreshToken)({
            userId: user.id,
        });
        const newTokenHash = (0, token_utils_1.hashToken)(newRefreshToken);
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma_1.default.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: newTokenHash,
                expiresAt: newExpiresAt,
            },
        });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    /**
     * Logout and invalidate refresh token
     */
    async logout(refreshTokenString) {
        if (refreshTokenString) {
            const tokenHash = (0, token_utils_1.hashToken)(refreshTokenString);
            await prisma_1.default.refreshToken.updateMany({
                where: { tokenHash, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }
    }
    /**
     * Revoke all sessions for a user
     */
    async revokeAllSessions(userId) {
        await prisma_1.default.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
