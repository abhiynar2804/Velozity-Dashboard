"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = exports.authenticate = void 0;
const token_utils_1 = require("../utils/token.utils");
const ApiResponse_1 = require("../utils/ApiResponse");
const prisma_1 = __importDefault(require("../utils/prisma"));
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json(ApiResponse_1.ApiResponse.error('Access token missing or malformed', 401));
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json(ApiResponse_1.ApiResponse.error('Access token missing', 401));
            return;
        }
        let payload;
        try {
            payload = (0, token_utils_1.verifyAccessToken)(token);
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                res.status(401).json(ApiResponse_1.ApiResponse.error('Access token expired', 401));
                return;
            }
            res.status(401).json(ApiResponse_1.ApiResponse.error('Invalid access token', 401));
            return;
        }
        // Optional database verification to ensure user still exists
        const userExists = await prisma_1.default.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true },
        });
        if (!userExists) {
            res.status(401).json(ApiResponse_1.ApiResponse.error('User not found or account deactivated', 401));
            return;
        }
        req.user = {
            userId: userExists.id,
            email: userExists.email,
            role: userExists.role,
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json(ApiResponse_1.ApiResponse.error('Authentication required', 401));
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json(ApiResponse_1.ApiResponse.error('Forbidden: insufficient permissions', 403));
            return;
        }
        next();
    };
};
exports.requireRoles = requireRoles;
