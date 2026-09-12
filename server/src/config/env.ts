import dotenv from "dotenv";

dotenv.config();

const requiredEnv = (name: string, minimumLength?: number): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  if (minimumLength !== undefined && value.length < minimumLength) {
    throw new Error(
      `Environment variable ${name} must be at least ${minimumLength} characters long`,
    );
  }

  return value;
};

export const env = {
  databaseUrl: requiredEnv("DATABASE_URL"),
  jwtAccessSecret: requiredEnv("JWT_ACCESS_SECRET", 32),
  jwtRefreshSecret: requiredEnv("JWT_REFRESH_SECRET", 32),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN?.trim() || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN?.trim() || "7d",
};
