"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitActivity = void 0;
const emitActivity = (io, activity) => {
    io.to(`project:${activity.projectId}`).emit("activity:created", activity);
};
exports.emitActivity = emitActivity;
