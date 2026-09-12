"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_events_1 = require("./socket/socket.events");
const emittedRooms = [];
const fakeIo = {
    to(room) {
        emittedRooms.push(room);
        return {
            emit() {
                return undefined;
            },
        };
    },
};
(0, socket_events_1.emitActivity)(fakeIo, {
    id: "activity-1",
    projectId: "project-1",
    taskId: "task-1",
    userId: "developer-1",
    oldStatus: "TODO",
    newStatus: "IN_PROGRESS",
    createdAt: new Date(),
});
const expectedRooms = ["project:project-1:staff", "task:task-1"];
if (JSON.stringify(emittedRooms) !== JSON.stringify(expectedRooms)) {
    throw new Error(`Unexpected activity rooms: ${JSON.stringify(emittedRooms)}`);
}
if (emittedRooms.includes("project:project-1")) {
    throw new Error("Activity must not be emitted to the shared project room");
}
console.log("✅ Socket activity authorization routing passed");
