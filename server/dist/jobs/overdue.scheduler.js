"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOverdueScheduler = exports.checkOverdueTasks = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const checkOverdueTasks = async () => {
    const now = new Date();
    const overdueTasks = await prisma_1.default.task.findMany({
        where: {
            dueDate: {
                lt: now,
            },
            isOverdue: false,
            status: {
                notIn: ["DONE"],
            },
        },
        select: {
            id: true,
            title: true,
            projectId: true,
            assignedDeveloperId: true,
        },
    });
    if (overdueTasks.length === 0) {
        return 0;
    }
    const overdueIds = overdueTasks.map((task) => task.id);
    await prisma_1.default.task.updateMany({
        where: { id: { in: overdueIds } },
        data: { isOverdue: true },
    });
    for (const task of overdueTasks) {
        if (task.assignedDeveloperId) {
            await prisma_1.default.notification.create({
                data: {
                    userId: task.assignedDeveloperId,
                    type: "TASK_IN_REVIEW",
                    message: `Task "${task.title}" is overdue. Please review it immediately.`,
                },
            });
        }
    }
    console.log(`🕒 Marked ${overdueTasks.length} tasks as overdue`);
    return overdueTasks.length;
};
exports.checkOverdueTasks = checkOverdueTasks;
const startOverdueScheduler = () => {
    const job = node_cron_1.default.schedule("*/5 * * * *", async () => {
        try {
            await (0, exports.checkOverdueTasks)();
        }
        catch (error) {
            console.error("Overdue scheduler failed:", error);
        }
    });
    void (0, exports.checkOverdueTasks)();
    console.log("⏰ Overdue scheduler started");
    return job;
};
exports.startOverdueScheduler = startOverdueScheduler;
