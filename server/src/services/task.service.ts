import prisma from "../utils/prisma";
import {
  NotificationType,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@prisma/client";
import { AppError } from "./auth.service";
import { CreateTaskInput, UpdateTaskInput } from "../validators/task.validator";
import { AccessTokenPayload } from "../utils/token.utils";

export class TaskService {
  /**
   * List tasks with strict data isolation:
   * - Admin: all tasks
   * - PM: only tasks in projects created by this PM
   * - Developer: only tasks assigned to this Developer
   */
  async listTasks(
    requestUser: AccessTokenPayload,
    query?: {
      projectId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      from?: string;
      to?: string;
    },
  ) {
    let whereClause: any = {};

    if (requestUser.role === UserRole.DEVELOPER) {
      whereClause.assignedDeveloperId = requestUser.userId;
    } else if (requestUser.role === UserRole.PROJECT_MANAGER) {
      whereClause.project = { createdById: requestUser.userId };
    }

    if (query?.projectId) {
      whereClause.projectId = query.projectId;
    }

    if (query?.status) {
      whereClause.status = query.status;
    }

    if (query?.priority) {
      whereClause.priority = query.priority;
    }

    if (query?.from || query?.to) {
      whereClause.dueDate = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return prisma.task.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, name: true, createdById: true },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create task:
   * - Developer: Forbidden
   * - PM: Allowed ONLY for projects owned by this PM
   * - Admin: Full access
   */
  async createTask(requestUser: AccessTokenPayload, input: CreateTaskInput) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError("Access denied: Developers cannot create tasks", 403);
    }

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) {
      throw new AppError("Project not found", 404);
    }

    if (
      requestUser.role === UserRole.PROJECT_MANAGER &&
      project.createdById !== requestUser.userId
    ) {
      throw new AppError(
        "Access denied: You cannot create tasks in projects managed by other Project Managers",
        403,
      );
    }

    if (input.assignedDeveloperId) {
      const dev = await prisma.user.findUnique({
        where: { id: input.assignedDeveloperId },
      });
      if (!dev || dev.role !== UserRole.DEVELOPER) {
        throw new AppError("Assigned user is not a developer", 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        assignedDeveloperId: input.assignedDeveloperId,
        priority: input.priority || TaskPriority.MEDIUM,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
      include: {
        project: true,
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify assigned developer
    if (task.assignedDeveloperId) {
      await prisma.notification.create({
        data: {
          userId: task.assignedDeveloperId,
          type: NotificationType.TASK_ASSIGNED,
          message: `You have been assigned to task: "${task.title}" in project "${project.name}"`,
        },
      });
    }

    return task;
  }

  /**
   * Get task by ID with strict ownership validation:
   * - Admin: Allowed
   * - PM: Allowed only if task belongs to a project owned by this PM
   * - Developer: Allowed ONLY if task is assigned to this developer
   */
  async getTaskById(requestUser: AccessTokenPayload, taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, name: true, createdById: true },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    if (requestUser.role === UserRole.ADMIN) {
      return task;
    }

    if (requestUser.role === UserRole.PROJECT_MANAGER) {
      if (task.project.createdById !== requestUser.userId) {
        throw new AppError(
          "Access denied: You cannot view tasks from another PM's project",
          403,
        );
      }
      return task;
    }

    if (requestUser.role === UserRole.DEVELOPER) {
      if (task.assignedDeveloperId !== requestUser.userId) {
        throw new AppError(
          "Access denied: You cannot view tasks assigned to other developers",
          403,
        );
      }
      return task;
    }

    throw new AppError("Unauthorized", 401);
  }

  /**
   * Update task:
   * - Developer: CAN ONLY update status of assigned tasks
   * - PM: Full update of tasks within owned projects
   * - Admin: Full update of any task
   */
  async updateTask(
    requestUser: AccessTokenPayload,
    taskId: string,
    input: UpdateTaskInput,
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // Developer authorization & constraints
    if (requestUser.role === UserRole.DEVELOPER) {
      if (task.assignedDeveloperId !== requestUser.userId) {
        throw new AppError(
          "Access denied: You cannot update tasks assigned to other developers",
          403,
        );
      }

      // Ensure developer only modifies status
      if (
        input.title !== undefined ||
        input.description !== undefined ||
        input.assignedDeveloperId !== undefined ||
        input.priority !== undefined ||
        input.dueDate !== undefined
      ) {
        throw new AppError(
          "Access denied: Developers can only update task status",
          403,
        );
      }

      if (!input.status) {
        throw new AppError("Status is required for developer task update", 400);
      }

      const oldStatus = task.status;
      const newStatus = input.status;

      return prisma.$transaction(async (tx) => {
        const updatedTask = await tx.task.update({
          where: { id: taskId },
          data: { status: newStatus },
          include: {
            project: true,
            assignedDeveloper: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        if (oldStatus !== newStatus) {
          await tx.activity.create({
            data: {
              projectId: task.projectId,
              taskId: task.id,
              userId: requestUser.userId,
              oldStatus,
              newStatus,
            },
          });

          if (newStatus === TaskStatus.IN_REVIEW) {
            await tx.notification.create({
              data: {
                userId: task.project.createdById,
                type: NotificationType.TASK_IN_REVIEW,
                message: `Task "${task.title}" is ready for review.`,
              },
            });
          }
        }

        return updatedTask;
      });
    }

    // PM authorization check
    if (
      requestUser.role === UserRole.PROJECT_MANAGER &&
      task.project.createdById !== requestUser.userId
    ) {
      throw new AppError(
        "Access denied: You cannot update tasks in another PM's project",
        403,
      );
    }

    // Admin & PM full update
    const oldStatus = task.status;
    const updateData: any = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.dueDate !== undefined)
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.assignedDeveloperId !== undefined) {
      if (input.assignedDeveloperId) {
        const dev = await prisma.user.findUnique({
          where: { id: input.assignedDeveloperId },
        });
        if (!dev || dev.role !== UserRole.DEVELOPER) {
          throw new AppError("Assigned user is not a developer", 400);
        }
      }
      updateData.assignedDeveloperId = input.assignedDeveloperId;
    }

    return prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          project: true,
          assignedDeveloper: { select: { id: true, name: true, email: true } },
        },
      });

      if (input.status !== undefined && input.status !== oldStatus) {
        await tx.activity.create({
          data: {
            projectId: task.projectId,
            taskId: task.id,
            userId: requestUser.userId,
            oldStatus,
            newStatus: input.status,
          },
        });
      }

      if (
        input.assignedDeveloperId &&
        input.assignedDeveloperId !== task.assignedDeveloperId
      ) {
        await tx.notification.create({
          data: {
            userId: input.assignedDeveloperId,
            type: NotificationType.TASK_ASSIGNED,
            message: `You have been assigned to task "${updatedTask.title}" in project "${task.project.name}"`,
          },
        });
      }

      return updatedTask;
    });
  }

  /**
   * Delete task:
   * - Developer: Forbidden
   * - PM: Allowed only in owned projects
   * - Admin: Allowed
   */
  async deleteTask(requestUser: AccessTokenPayload, taskId: string) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError("Access denied: Developers cannot delete tasks", 403);
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    if (
      requestUser.role === UserRole.PROJECT_MANAGER &&
      task.project.createdById !== requestUser.userId
    ) {
      throw new AppError(
        "Access denied: You cannot delete tasks in another PM's project",
        403,
      );
    }

    // Remove associated activity records
    await prisma.activity.deleteMany({ where: { taskId } });

    return prisma.task.delete({
      where: { id: taskId },
    });
  }
}

export const taskService = new TaskService();
