import { Request, Response, NextFunction } from 'express';
import { authService, AppError } from '../services/auth.service';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '../utils/cookie.utils';
import { ApiResponse } from '../utils/ApiResponse';
import prisma from '../utils/prisma';

export class AuthController {
  /**
   * Register new user
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);

      // Set HttpOnly cookie for refresh token
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(201).json(
        ApiResponse.success(
          'User registered successfully',
          {
            user: result.user,
            accessToken: result.accessToken,
          },
          201
        )
      );
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  /**
   * User login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);

      // Set HttpOnly cookie for refresh token
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json(
        ApiResponse.success(
          'Login successful',
          {
            user: result.user,
            accessToken: result.accessToken,
          },
          200
        )
      );
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  /**
   * Refresh token
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] ||
        req.body?.refreshToken ||
        (req.headers['x-refresh-token'] as string);

      if (!refreshToken) {
        res.status(401).json(ApiResponse.error('Refresh token missing from cookie or header', 401));
        return;
      }

      const result = await authService.refresh(refreshToken);

      // Set rotated refresh token in HttpOnly cookie
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json(
        ApiResponse.success(
          'Token refreshed successfully',
          {
            accessToken: result.accessToken,
            user: result.user,
          },
          200
        )
      );
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] ||
        req.body?.refreshToken ||
        (req.headers['x-refresh-token'] as string);

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Invalidate HttpOnly cookie
      clearRefreshTokenCookie(res);

      res.status(200).json(ApiResponse.success('Logged out successfully', null, 200));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json(ApiResponse.error('Not authenticated', 401));
        return;
      }

      const user = await prisma.user.findUnique({
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
        res.status(404).json(ApiResponse.error('User not found', 404));
        return;
      }

      res.status(200).json(ApiResponse.success('User profile fetched successfully', user, 200));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
