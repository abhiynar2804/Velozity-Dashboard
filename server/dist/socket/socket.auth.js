"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthentication = void 0;
const token_utils_1 = require("../utils/token.utils");
const socketAuthentication = (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("Authentication required"));
        }
        const payload = (0, token_utils_1.verifyAccessToken)(token);
        socket.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        };
        next();
    }
    catch {
        next(new Error("Invalid or expired access token"));
    }
};
exports.socketAuthentication = socketAuthentication;
