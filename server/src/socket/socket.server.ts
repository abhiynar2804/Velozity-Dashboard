import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { AuthenticatedSocket, socketAuthentication } from "./socket.auth";
import { canAccessProject } from "./socket.authorization";

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

    console.log(`🔌 User connected: ${authenticatedSocket.user?.userId}`);

    socket.on("project:join", async (projectId: string) => {
  try {
    const user = authenticatedSocket.user;

    if (!user) {
      return;
    }

    const allowed = await canAccessProject(
      user.userId,
      user.role,
      projectId
    );

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

    console.log(
      `User ${user.userId} joined project:${projectId}`
    );
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

      console.log(
        `User ${authenticatedSocket.user?.userId} left project ${projectId}`,
      );
    });

    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
    });
  });

  return io;
};
