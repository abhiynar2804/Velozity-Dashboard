import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export interface PresenceUser {
  userId: string;
  email: string;
  role: string;
  socketId: string;
  projectIds: string[];
}

export interface PresencePayload {
  onlineCount: number;
  users: PresenceUser[];
}

export interface ProjectPresencePayload {
  projectId: string;
  onlineCount: number;
  users: PresenceUser[];
}

export interface NotificationEvent {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const setSocketAuthToken = (
  accessToken: string | null,
  reconnect = false,
): void => {
  socket.auth = accessToken ? { token: accessToken } : {};

  if (reconnect && accessToken && socket.connected) {
    socket.disconnect();
    socket.connect();
  }
};

export const connectSocket = (accessToken: string): void => {
  setSocketAuthToken(accessToken);
  if (!socket.connected) socket.connect();
};

export const disconnectSocket = (): void => {
  if (socket.connected) socket.disconnect();
};

export const joinProjectRoom = (projectId: string): void => {
  socket.emit("project:join", projectId);
};

export const leaveProjectRoom = (projectId: string): void => {
  socket.emit("project:leave", projectId);
};
