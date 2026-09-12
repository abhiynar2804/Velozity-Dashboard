import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  NotificationType,
  PrismaClient,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@prisma/client";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const seedPrefix = "Velozity Seed";
const seedPassword = "Password123!";

async function main() {
  console.log("Seeding Velozity assessment data...");

  const passwordHash = await hash(seedPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@velozity.test" },
    update: { name: "Velozity Seed Admin", role: UserRole.ADMIN, passwordHash },
    create: {
      name: "Velozity Seed Admin",
      email: "admin@velozity.test",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const projectManagers = await Promise.all(
    ["pm.one@velozity.test", "pm.two@velozity.test"].map((email, index) =>
      prisma.user.upsert({
        where: { email },
        update: {
          name: `${seedPrefix} Project Manager ${index + 1}`,
          role: UserRole.PROJECT_MANAGER,
          passwordHash,
        },
        create: {
          name: `${seedPrefix} Project Manager ${index + 1}`,
          email,
          passwordHash,
          role: UserRole.PROJECT_MANAGER,
        },
      }),
    ),
  );

  const developers = await Promise.all(
    ["one", "two", "three", "four"].map((name, index) => {
      const email = `developer.${name}@velozity.test`;
      return prisma.user.upsert({
        where: { email },
        update: {
          name: `${seedPrefix} Developer ${index + 1}`,
          role: UserRole.DEVELOPER,
          passwordHash,
        },
        create: {
          name: `${seedPrefix} Developer ${index + 1}`,
          email,
          passwordHash,
          role: UserRole.DEVELOPER,
        },
      });
    }),
  );

  await prisma.notification.deleteMany({
    where: {
      userId: {
        in: [
          admin.id,
          ...projectManagers.map((user) => user.id),
          ...developers.map((user) => user.id),
        ],
      },
    },
  });

  await prisma.project.deleteMany({
    where: { name: { startsWith: seedPrefix } },
  });
  await prisma.client.deleteMany({
    where: { name: { startsWith: seedPrefix } },
  });

  const clients = await Promise.all(
    ["Northstar Labs", "Meridian Health", "Cedar & Co."].map((name, index) =>
      prisma.client.create({
        data: {
          name: `${seedPrefix} ${name}`,
          company: name,
          email: `client${index + 1}@velozity.test`,
        },
      }),
    ),
  );

  const projectDefinitions = [
    { name: "Atlas mobile launch", managerId: projectManagers[0].id },
    { name: "Beacon analytics platform", managerId: projectManagers[0].id },
    { name: "Cedar operations refresh", managerId: projectManagers[1].id },
  ];

  const now = Date.now();
  const taskStatuses: TaskStatus[] = [
    TaskStatus.IN_PROGRESS,
    TaskStatus.TODO,
    TaskStatus.IN_REVIEW,
    TaskStatus.DONE,
    TaskStatus.TODO,
  ];
  const taskPriorities: TaskPriority[] = [
    TaskPriority.CRITICAL,
    TaskPriority.HIGH,
    TaskPriority.MEDIUM,
    TaskPriority.LOW,
    TaskPriority.HIGH,
  ];

  for (const [projectIndex, definition] of projectDefinitions.entries()) {
    const project = await prisma.project.create({
      data: {
        name: `${seedPrefix} ${definition.name}`,
        description: `Seeded project ${projectIndex + 1} for dashboard assessment flows.`,
        clientId: clients[projectIndex].id,
        createdById: definition.managerId,
      },
    });

    for (let taskIndex = 0; taskIndex < 5; taskIndex += 1) {
      const isOverdue =
        (projectIndex === 0 && taskIndex === 0) ||
        (projectIndex === 1 && taskIndex === 1);
      const status = taskStatuses[taskIndex];
      const assignedDeveloper =
        developers[(projectIndex * 2 + taskIndex) % developers.length];
      const dueDate = new Date(
        now + (isOverdue ? -3 : taskIndex + 2) * 24 * 60 * 60 * 1000,
      );

      const task = await prisma.task.create({
        data: {
          title: `${definition.name} task ${taskIndex + 1}`,
          description: `Seed task ${taskIndex + 1} for ${definition.name}.`,
          projectId: project.id,
          assignedDeveloperId: assignedDeveloper.id,
          status,
          priority: taskPriorities[taskIndex],
          dueDate,
          isOverdue,
        },
      });

      await prisma.activity.create({
        data: {
          projectId: project.id,
          taskId: task.id,
          userId: assignedDeveloper.id,
          oldStatus: TaskStatus.TODO,
          newStatus: status,
          createdAt: new Date(now - (taskIndex + 1) * 60 * 60 * 1000),
        },
      });

      await prisma.notification.create({
        data: {
          userId: assignedDeveloper.id,
          type: NotificationType.TASK_ASSIGNED,
          message: `You have been assigned to task: "${task.title}"`,
          createdAt: new Date(now - taskIndex * 60 * 60 * 1000),
        },
      });

      if (status === TaskStatus.IN_REVIEW) {
        await prisma.notification.create({
          data: {
            userId: definition.managerId,
            type: NotificationType.TASK_IN_REVIEW,
            message: `Task "${task.title}" is ready for review.`,
          },
        });
      }
    }
  }

  console.log("Seed complete:");
  console.log("- 1 admin");
  console.log("- 2 project managers");
  console.log("- 4 developers");
  console.log("- 3 projects with 5 tasks each");
  console.log("- 2 overdue tasks");
  console.log("- 15 activity records");
  console.log(`Login password for all seeded users: ${seedPassword}`);
  console.log(`Admin login: ${admin.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
