import { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/token.utils";

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const socketAuthentication = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const payload = verifyAccessToken(token);

    socket.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    next(new Error("Invalid or expired access token"));
  }
};