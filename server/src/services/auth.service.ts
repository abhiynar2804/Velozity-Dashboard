import prisma from '../utils/prisma';
import { hashPassword, comparePassword } from '../utils/password.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/token.utils';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { UserRole } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface AuthResult {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role || UserRole.DEVELOPER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
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
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
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
  async refresh(refreshTokenString: string): Promise<{ accessToken: string; refreshToken: string; user: UserResponse }> {
    if (!refreshTokenString) {
      throw new AppError('Refresh token required', 401);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenString);
    } catch (err: any) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const incomingTokenHash = hashToken(refreshTokenString);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: incomingTokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Refresh token not recognized or already used', 401);
    }

    if (storedToken.revokedAt) {
      // Possible token reuse attempt: invalidate all tokens for this user for security
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError('Refresh token has been revoked', 403);
    }

    if (new Date() > storedToken.expiresAt) {
      throw new AppError('Refresh token has expired', 401);
    }

    // Invalidate old token (Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = storedToken.user;

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
    });

    const newTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
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
  async logout(refreshTokenString?: string): Promise<void> {
    if (refreshTokenString) {
      const tokenHash = hashToken(refreshTokenString);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authService = new AuthService();
