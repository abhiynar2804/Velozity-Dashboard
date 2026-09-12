"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_server_1 = require("./socket/socket.server");
const createPresenceUser = (socketId, userId, projectIds) => ({
    userId,
    email: `${userId}@example.com`,
    role: "DEVELOPER",
    socketId,
    projectIds: new Set(projectIds),
    projectTaskIds: new Map(),
});
const users = (0, socket_server_1.aggregatePresenceUsers)([
    createPresenceUser("socket-1", "user-1", ["project-1"]),
    createPresenceUser("socket-2", "user-1", ["project-2"]),
    createPresenceUser("socket-3", "user-2", ["project-1"]),
]);
if (users.length !== 2) {
    throw new Error(`Expected 2 unique users, got ${users.length}`);
}
const firstUser = users.find((user) => user.userId === "user-1");
if (!firstUser ||
    firstUser.projectIds.sort().join(",") !== "project-1,project-2") {
    throw new Error("Duplicate socket presence did not merge project membership");
}
console.log("✅ Unique presence aggregation passed");
