import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/token.utils';
import { ApiResponse } from '../utils/ApiResponse';
import { UserRole } from '@prisma/client';
import prisma from '../utils/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(ApiResponse.error('Access token missing or malformed', 401));
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json(ApiResponse.error('Access token missing', 401));
      return;
    }

    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json(ApiResponse.error('Access token expired', 401));
        return;
      }
      res.status(401).json(ApiResponse.error('Invalid access token', 401));
      return;
    }

    // Optional database verification to ensure user still exists
    const userExists = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true },
    });

    if (!userExists) {
      res.status(401).json(ApiResponse.error('User not found or account deactivated', 401));
      return;
    }

    req.user = {
      userId: userExists.id,
      email: userExists.email,
      role: userExists.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(ApiResponse.error('Authentication required', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(ApiResponse.error('Forbidden: insufficient permissions', 403));
      return;
    }

    next();
  };
};
