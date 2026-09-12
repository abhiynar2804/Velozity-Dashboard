import { Server } from "socket.io";

export interface NotificationEvent {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  oldStatus: string;
  newStatus: string;
  createdAt: Date;
}

export const emitActivity = (io: Server, activity: ActivityEvent) => {
  io.to(`project:${activity.projectId}`).emit("activity:created", activity);
};

export const emitNotification = (
  io: Server,
  notification: NotificationEvent,
) => {
  io.to(`user:${notification.userId}`).emit(
    "notification:created",
    notification,
  );
};
