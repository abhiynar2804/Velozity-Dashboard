import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { AuthenticatedSocket, socketAuthentication } from "./socket.auth";
import { canAccessProject } from "./socket.authorization";

interface PresenceUser {
  userId: string;
  email: string;
  role: string;
  socketId: string;
  projectIds: Set<string>;
}

const connectedUsers = new Map<string, PresenceUser>();

const serializePresenceUser = (user: PresenceUser) => ({
  userId: user.userId,
  email: user.email,
  role: user.role,
  socketId: user.socketId,
  projectIds: Array.from(user.projectIds),
});

const broadcastPresence = (io: Server) => {
  const users = Array.from(connectedUsers.values()).map(serializePresenceUser);

  io.emit("presence:updated", {
    onlineCount: users.length,
    users,
  });
};

const broadcastProjectPresence = (io: Server, projectId: string) => {
  const roomUsers = Array.from(connectedUsers.values())
    .filter((user) => user.projectIds.has(projectId))
    .map(serializePresenceUser);

  io.to(`project:${projectId}`).emit("presence:project", {
    projectId,
    onlineCount: roomUsers.length,
    users: roomUsers,
  });
};

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(socketAuthentication);

  io.on("connection", (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
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
    });
    socket.join(`user:${user.userId}`);

    console.log(`🔌 User connected: ${user.userId}`);
    broadcastPresence(io);

    socket.on("project:join", async (projectId: string) => {
      try {
        if (!user) {
          return;
        }

        const allowed = await canAccessProject(
          user.userId,
          user.role,
          projectId,
        );

        if (!allowed) {
          socket.emit("project:access_denied", {
            projectId,
            message: "You do not have access to this project",
          });

          return;
        }

        socket.join(`project:${projectId}`);

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
      } catch (error) {
        console.error("Project room error:", error);

        socket.emit("project:access_denied", {
          projectId,
          message: "Unable to join project",
        });
      }
    });

    socket.on("project:leave", (projectId: string) => {
      socket.leave(`project:${projectId}`);

      const currentUser = connectedUsers.get(socket.id);
      if (currentUser) {
        currentUser.projectIds.delete(projectId);
      }

      broadcastProjectPresence(io, projectId);
      broadcastPresence(io);

      console.log(
        `User ${authenticatedSocket.user?.userId} left project ${projectId}`,
      );
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
