"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const prisma_1 = __importDefault(require("./utils/prisma"));
exports.prisma = prisma_1.default;
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const ApiResponse_1 = require("./utils/ApiResponse");
dotenv_1.default.config();
exports.app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Security & Parsing Middleware
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || true, // Allow frontend origin
    credentials: true, // Allow cookies across origins
}));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
    exports.app.use((0, morgan_1.default)('dev'));
}
// Health Check
exports.app.get('/health', async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.status(200).json(ApiResponse_1.ApiResponse.success('Server is healthy and DB is connected', { status: 'ok' }));
    }
    catch (error) {
        res.status(500).json(ApiResponse_1.ApiResponse.error('Database connection failed', 500, error?.message));
    }
});
// Authentication Routes
exports.app.use('/api/auth', auth_routes_1.default);
// Protected Test Route
exports.app.get('/api/protected', auth_middleware_1.authenticate, (req, res) => {
    res.status(200).json(ApiResponse_1.ApiResponse.success('Access granted to protected route', {
        user: req.user,
        secretData: 'Confidential Dashboard Metric Information',
    }));
});
// Error Handling Middleware
exports.app.use(error_middleware_1.errorHandler);
// Start server if not imported by test
if (process.env.NODE_ENV !== 'test') {
    exports.app.listen(port, () => {
        console.log(`🚀 Server is running at http://localhost:${port}`);
    });
}
exports.default = exports.app;
