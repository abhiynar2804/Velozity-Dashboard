"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const requiredEnv = (name, minimumLength) => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    if (minimumLength !== undefined && value.length < minimumLength) {
        throw new Error(`Environment variable ${name} must be at least ${minimumLength} characters long`);
    }
    return value;
};
exports.env = {
    databaseUrl: requiredEnv("DATABASE_URL"),
    jwtAccessSecret: requiredEnv("JWT_ACCESS_SECRET", 32),
    jwtRefreshSecret: requiredEnv("JWT_REFRESH_SECRET", 32),
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN?.trim() || "15m",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN?.trim() || "7d",
    clientUrl: process.env.CLIENT_URL?.trim() ||
        (process.env.NODE_ENV === "production"
            ? requiredEnv("CLIENT_URL")
            : "http://localhost:5173"),
};
