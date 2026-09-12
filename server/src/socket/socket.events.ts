import { Server } from "socket.io";

export interface ActivityEvent {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  oldStatus: string;
  newStatus: string;
  createdAt: Date;
}

export const emitActivity = (
  io: Server,
  activity: ActivityEvent
) => {
  io.to(`project:${activity.projectId}`).emit(
    "activity:created",
    activity
  );
};