"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const env_1 = require("../config/env");
const pool = new pg_1.Pool({ connectionString: env_1.env.databaseUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
    });
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
