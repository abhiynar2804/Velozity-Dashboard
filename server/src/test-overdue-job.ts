process.env.NODE_ENV = "test";

import prisma from "./utils/prisma";
import {
  checkOverdueTasks,
  startOverdueScheduler,
} from "./jobs/overdue.scheduler";

async function runOverdueJobTest() {
  console.log("🧪 Testing overdue scheduler...");

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      name: "Overdue Tester",
      email: `overdue.${Date.now()}@example.com`,
      passwordHash: "hashed-password",
      role: "DEVELOPER",
    },
  });

  const client = await prisma.client.create({
    data: {
      name: "Overdue Client",
      email: "client@example.com",
      company: "Demo",
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Overdue Project",
      clientId: client.id,
      createdById: user.id,
    },
  });

  const task = await prisma.task.create({
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
    startOverdueScheduler();
    await checkOverdueTasks();

    const refreshedTask = await prisma.task.findUnique({
      where: { id: task.id },
    });

    if (!refreshedTask) {
      throw new Error("Task missing after overdue run");
    }

    if (!refreshedTask.isOverdue) {
      throw new Error("Task was not marked overdue");
    }

    console.log("✅ PASS: overdue scheduler marked a past-due task as overdue");
  } finally {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.activity.deleteMany({ where: { taskId: task.id } });
    await prisma.task.delete({ where: { id: task.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.client.delete({ where: { id: client.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

runOverdueJobTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ FAIL:", error);
    process.exit(1);
  });
