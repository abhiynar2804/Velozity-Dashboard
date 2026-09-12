import cron from "node-cron";
import prisma from "../utils/prisma";

export const checkOverdueTasks = async () => {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
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

  await prisma.task.updateMany({
    where: { id: { in: overdueIds } },
    data: { isOverdue: true },
  });

  for (const task of overdueTasks) {
    if (task.assignedDeveloperId) {
      await prisma.notification.create({
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

export const startOverdueScheduler = () => {
  const job = cron.schedule("*/5 * * * *", async () => {
    try {
      await checkOverdueTasks();
    } catch (error) {
      console.error("Overdue scheduler failed:", error);
    }
  });

  void checkOverdueTasks();

  console.log("⏰ Overdue scheduler started");
  return job;
};
