"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitNotification = exports.emitActivity = void 0;
const emitActivity = (io, activity) => {
    io.to(`project:${activity.projectId}`).emit("activity:created", activity);
};
exports.emitActivity = emitActivity;
const emitNotification = (io, notification) => {
    io.to(`user:${notification.userId}`).emit("notification:created", notification);
};
exports.emitNotification = emitNotification;
