import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = (accessToken: string): void => {
  socket.auth = { token: accessToken };
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
