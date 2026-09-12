import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";

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

export const generateAccessToken = (
  payload: Omit<AccessTokenPayload, "jti">,
): string => {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn,
    } as jwt.SignOptions,
  );
};

export const generateRefreshToken = (
  payload: Omit<RefreshTokenPayload, "jti">,
): string => {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
    },
    env.jwtRefreshSecret,
    {
      expiresIn: env.jwtRefreshExpiresIn,
    } as jwt.SignOptions,
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
