"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const socket_auth_1 = require("./socket.auth");
const socket_authorization_1 = require("./socket.authorization");
const initializeSocket = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            credentials: true,
        },
    });
    io.use(socket_auth_1.socketAuthentication);
    io.on("connection", (socket) => {
        const authenticatedSocket = socket;
        console.log(`🔌 User connected: ${authenticatedSocket.user?.userId}`);
        socket.on("project:join", async (projectId) => {
            try {
                const user = authenticatedSocket.user;
                if (!user) {
                    return;
                }
                const allowed = await (0, socket_authorization_1.canAccessProject)(user.userId, user.role, projectId);
                if (!allowed) {
                    socket.emit("project:access_denied", {
                        projectId,
                        message: "You do not have access to this project",
                    });
                    return;
                }
                socket.join(`project:${projectId}`);
                socket.emit("project:joined", {
                    projectId,
                    message: "Joined project room",
                });
                console.log(`User ${user.userId} joined project:${projectId}`);
            }
            catch (error) {
                console.error("Project room error:", error);
                socket.emit("project:access_denied", {
                    projectId,
                    message: "Unable to join project",
                });
            }
        });
        socket.on("project:leave", (projectId) => {
            socket.leave(`project:${projectId}`);
            console.log(`User ${authenticatedSocket.user?.userId} left project ${projectId}`);
        });
        socket.on("disconnect", () => {
            console.log(`🔌 User disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
