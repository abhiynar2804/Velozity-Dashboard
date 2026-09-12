import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { AuthenticatedSocket, socketAuthentication } from "./socket.auth";
import {
  canAccessProject,
  getDeveloperProjectTaskIds,
} from "./socket.authorization";
import { env } from "../config/env";

export interface PresenceUser {
  userId: string;
  email: string;
  role: string;
  socketId: string;
  projectIds: Set<string>;
  projectTaskIds: Map<string, Set<string>>;
}

const connectedUsers = new Map<string, PresenceUser>();

const serializePresenceUser = (user: PresenceUser) => ({
  userId: user.userId,
  email: user.email,
  role: user.role,
  socketId: user.socketId,
  projectIds: Array.from(user.projectIds),
});

export const aggregatePresenceUsers = (users: Iterable<PresenceUser>) => {
  const usersById = new Map<string, PresenceUser>();

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

const broadcastPresence = (io: Server) => {
  const users = aggregatePresenceUsers(connectedUsers.values());

  io.emit("presence:updated", {
    onlineCount: users.length,
    users,
  });
};

const broadcastProjectPresence = (io: Server, projectId: string) => {
  const roomUsers = aggregatePresenceUsers(
    Array.from(connectedUsers.values()).filter((user) =>
      user.projectIds.has(projectId),
    ),
  );

  io.to(`project:${projectId}`).emit("presence:project", {
    projectId,
    onlineCount: roomUsers.length,
    users: roomUsers,
  });
};

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
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
      projectTaskIds: new Map(),
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
        if (user.role === "ADMIN" || user.role === "PROJECT_MANAGER") {
          socket.join(`project:${projectId}:staff`);
        } else if (user.role === "DEVELOPER") {
          const taskIds = await getDeveloperProjectTaskIds(
            user.userId,
            projectId,
          );
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
