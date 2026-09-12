"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = exports.aggregatePresenceUsers = void 0;
const socket_io_1 = require("socket.io");
const socket_auth_1 = require("./socket.auth");
const socket_authorization_1 = require("./socket.authorization");
const env_1 = require("../config/env");
const connectedUsers = new Map();
const serializePresenceUser = (user) => ({
    userId: user.userId,
    email: user.email,
    role: user.role,
    socketId: user.socketId,
    projectIds: Array.from(user.projectIds),
});
const aggregatePresenceUsers = (users) => {
    const usersById = new Map();
    for (const user of users) {
        const existingUser = usersById.get(user.userId);
        if (!existingUser) {
            usersById.set(user.userId, {
                ...user,
                projectIds: new Set(user.projectIds),
                projectTaskIds: new Map(user.projectTaskIds),
            });
            continue;
        }
        user.projectIds.forEach((projectId) => {
            existingUser.projectIds.add(projectId);
        });
    }
    return Array.from(usersById.values()).map(serializePresenceUser);
};
exports.aggregatePresenceUsers = aggregatePresenceUsers;
const broadcastPresence = (io) => {
    const users = (0, exports.aggregatePresenceUsers)(connectedUsers.values());
    io.emit("presence:updated", {
        onlineCount: users.length,
        users,
    });
};
const broadcastProjectPresence = (io, projectId) => {
    const roomUsers = (0, exports.aggregatePresenceUsers)(Array.from(connectedUsers.values()).filter((user) => user.projectIds.has(projectId)));
    io.to(`project:${projectId}`).emit("presence:project", {
        projectId,
        onlineCount: roomUsers.length,
        users: roomUsers,
    });
};
const initializeSocket = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: env_1.env.clientUrl,
            credentials: true,
        },
    });
    io.use(socket_auth_1.socketAuthentication);
    io.on("connection", (socket) => {
        const authenticatedSocket = socket;
        const user = authenticatedSocket.user;
        if (!user) {
            socket.disconnect();
            return;
        }
        connectedUsers.set(socket.id, {
            userId: user.userId,
            email: user.email,
            role: user.role,
            socketId: socket.id,
            projectIds: new Set(),
            projectTaskIds: new Map(),
        });
        socket.join(`user:${user.userId}`);
        console.log(`🔌 User connected: ${user.userId}`);
        broadcastPresence(io);
        socket.on("project:join", async (projectId) => {
            try {
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
                if (user.role === "ADMIN" || user.role === "PROJECT_MANAGER") {
                    socket.join(`project:${projectId}:staff`);
                }
                else if (user.role === "DEVELOPER") {
                    const taskIds = await (0, socket_authorization_1.getDeveloperProjectTaskIds)(user.userId, projectId);
                    taskIds.forEach((taskId) => socket.join(`task:${taskId}`));
                    const currentUser = connectedUsers.get(socket.id);
                    currentUser?.projectTaskIds.set(projectId, new Set(taskIds));
                }
                const currentUser = connectedUsers.get(socket.id);
                if (currentUser) {
                    currentUser.projectIds.add(projectId);
                }
                socket.emit("project:joined", {
                    projectId,
                    message: "Joined project room",
                });
                broadcastProjectPresence(io, projectId);
                broadcastPresence(io);
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
            socket.leave(`project:${projectId}:staff`);
            const currentUser = connectedUsers.get(socket.id);
            if (currentUser) {
                currentUser.projectIds.delete(projectId);
                currentUser.projectTaskIds.get(projectId)?.forEach((taskId) => {
                    socket.leave(`task:${taskId}`);
                });
                currentUser.projectTaskIds.delete(projectId);
            }
            broadcastProjectPresence(io, projectId);
            broadcastPresence(io);
            console.log(`User ${authenticatedSocket.user?.userId} left project ${projectId}`);
        });
        socket.on("disconnect", () => {
            const disconnectedUser = connectedUsers.get(socket.id);
            connectedUsers.delete(socket.id);
            if (disconnectedUser) {
                for (const projectId of disconnectedUser.projectIds) {
                    broadcastProjectPresence(io, projectId);
                }
            }
            broadcastPresence(io);
            console.log(`🔌 User disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
