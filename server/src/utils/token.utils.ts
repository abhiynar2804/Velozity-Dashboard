import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId?: string;
  jti?: string;
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'velozity_super_secret_access_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'velozity_super_secret_refresh_jwt_key_2026';

const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateAccessToken = (payload: Omit<AccessTokenPayload, 'jti'>): string => {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
    },
    JWT_ACCESS_SECRET,
    {
      expiresIn: JWT_ACCESS_EXPIRES_IN,
    } as jwt.SignOptions
  );
};

export const generateRefreshToken = (payload: Omit<RefreshTokenPayload, 'jti'>): string => {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
