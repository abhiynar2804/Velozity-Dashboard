"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const prisma_1 = __importDefault(require("./utils/prisma"));
exports.prisma = prisma_1.default;
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const client_routes_1 = __importDefault(require("./routes/client.routes"));
const project_routes_1 = __importDefault(require("./routes/project.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const activity_routes_1 = __importDefault(require("./routes/activity.routes"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const ApiResponse_1 = require("./utils/ApiResponse");
const http_1 = require("http");
const socket_server_1 = require("./socket/socket.server");
const task_service_1 = require("./services/task.service");
const overdue_scheduler_1 = require("./jobs/overdue.scheduler");
const env_1 = require("./config/env");
exports.app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Security & Parsing Middleware
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: env_1.env.clientUrl,
    credentials: true, // Allow cookies across origins
}));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") {
    exports.app.use((0, morgan_1.default)("dev"));
}
// Health Check
exports.app.get("/health", async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res
            .status(200)
            .json(ApiResponse_1.ApiResponse.success("Server is healthy and DB is connected", {
            status: "ok",
        }));
    }
    catch (error) {
        res
            .status(500)
            .json(ApiResponse_1.ApiResponse.error("Database connection failed", 500, error?.message));
    }
});
// Mount Routes
exports.app.use("/api/auth", auth_routes_1.default);
exports.app.use("/api/users", user_routes_1.default);
exports.app.use("/api/clients", client_routes_1.default);
exports.app.use("/api/projects", project_routes_1.default);
exports.app.use("/api/tasks", task_routes_1.default);
exports.app.use("/api/activities", activity_routes_1.default);
// Protected Test Route
exports.app.get("/api/protected", auth_middleware_1.authenticate, (req, res) => {
    res.status(200).json(ApiResponse_1.ApiResponse.success("Access granted to protected route", {
        user: req.user,
        secretData: "Confidential Dashboard Metric Information",
    }));
});
// Error Handling Middleware
exports.app.use(error_middleware_1.errorHandler);
// Start server if not imported by test
const httpServer = (0, http_1.createServer)(exports.app);
const io = (0, socket_server_1.initializeSocket)(httpServer);
task_service_1.taskService.setSocketServer(io);
(0, overdue_scheduler_1.startOverdueScheduler)();
if (process.env.NODE_ENV !== "test") {
    httpServer.listen(port, () => {
        console.log(`🚀 Server is running at http://localhost:${port}`);
    });
}
exports.default = exports.app;
