import { Server } from "socket.io";
import { emitActivity } from "./socket/socket.events";

const emittedRooms: string[] = [];
const fakeIo = {
  to(room: string) {
    emittedRooms.push(room);
    return {
      emit() {
        return undefined;
      },
    };
  },
} as unknown as Server;

emitActivity(fakeIo, {
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
