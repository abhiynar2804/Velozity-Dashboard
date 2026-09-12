"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = "test";
const prisma_1 = __importDefault(require("./utils/prisma"));
const overdue_scheduler_1 = require("./jobs/overdue.scheduler");
async function runOverdueJobTest() {
    console.log("🧪 Testing overdue scheduler...");
    const now = new Date();
    const user = await prisma_1.default.user.create({
        data: {
            name: "Overdue Tester",
            email: `overdue.${Date.now()}@example.com`,
            passwordHash: "hashed-password",
            role: "DEVELOPER",
        },
    });
    const client = await prisma_1.default.client.create({
        data: {
            name: "Overdue Client",
            email: "client@example.com",
            company: "Demo",
        },
    });
    const project = await prisma_1.default.project.create({
        data: {
            name: "Overdue Project",
            clientId: client.id,
            createdById: user.id,
        },
    });
    const task = await prisma_1.default.task.create({
        data: {
            title: "Expired task",
            description: "This must become overdue",
            projectId: project.id,
            assignedDeveloperId: user.id,
            dueDate: new Date(now.getTime() - 60_000),
            status: "IN_PROGRESS",
            isOverdue: false,
        },
    });
    try {
        (0, overdue_scheduler_1.startOverdueScheduler)();
        await (0, overdue_scheduler_1.checkOverdueTasks)();
        const refreshedTask = await prisma_1.default.task.findUnique({
            where: { id: task.id },
        });
        if (!refreshedTask) {
            throw new Error("Task missing after overdue run");
        }
        if (!refreshedTask.isOverdue) {
            throw new Error("Task was not marked overdue");
        }
        console.log("✅ PASS: overdue scheduler marked a past-due task as overdue");
    }
    finally {
        await prisma_1.default.notification.deleteMany({ where: { userId: user.id } });
        await prisma_1.default.activity.deleteMany({ where: { taskId: task.id } });
        await prisma_1.default.task.delete({ where: { id: task.id } });
        await prisma_1.default.project.delete({ where: { id: project.id } });
        await prisma_1.default.client.delete({ where: { id: client.id } });
        await prisma_1.default.user.delete({ where: { id: user.id } });
    }
}
runOverdueJobTest()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error("❌ FAIL:", error);
    process.exit(1);
});
