"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = exports.TaskService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const auth_service_1 = require("./auth.service");
class TaskService {
    /**
     * List tasks with strict data isolation:
     * - Admin: all tasks
     * - PM: only tasks in projects created by this PM
     * - Developer: only tasks assigned to this Developer
     */
    async listTasks(requestUser, query) {
        let whereClause = {};
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            whereClause.assignedDeveloperId = requestUser.userId;
        }
        else if (requestUser.role === client_1.UserRole.PROJECT_MANAGER) {
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
        return prisma_1.default.task.findMany({
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
    async createTask(requestUser, input) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError("Access denied: Developers cannot create tasks", 403);
        }
        const project = await prisma_1.default.project.findUnique({
            where: { id: input.projectId },
        });
        if (!project) {
            throw new auth_service_1.AppError("Project not found", 404);
        }
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER &&
            project.createdById !== requestUser.userId) {
            throw new auth_service_1.AppError("Access denied: You cannot create tasks in projects managed by other Project Managers", 403);
        }
        if (input.assignedDeveloperId) {
            const dev = await prisma_1.default.user.findUnique({
                where: { id: input.assignedDeveloperId },
            });
            if (!dev || dev.role !== client_1.UserRole.DEVELOPER) {
                throw new auth_service_1.AppError("Assigned user is not a developer", 400);
            }
        }
        const task = await prisma_1.default.task.create({
            data: {
                title: input.title,
                description: input.description,
                projectId: input.projectId,
                assignedDeveloperId: input.assignedDeveloperId,
                priority: input.priority || client_1.TaskPriority.MEDIUM,
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
            await prisma_1.default.notification.create({
                data: {
                    userId: task.assignedDeveloperId,
                    type: client_1.NotificationType.TASK_ASSIGNED,
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
    async getTaskById(requestUser, taskId) {
        const task = await prisma_1.default.task.findUnique({
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
            throw new auth_service_1.AppError("Task not found", 404);
        }
        if (requestUser.role === client_1.UserRole.ADMIN) {
            return task;
        }
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER) {
            if (task.project.createdById !== requestUser.userId) {
                throw new auth_service_1.AppError("Access denied: You cannot view tasks from another PM's project", 403);
            }
            return task;
        }
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            if (task.assignedDeveloperId !== requestUser.userId) {
                throw new auth_service_1.AppError("Access denied: You cannot view tasks assigned to other developers", 403);
            }
            return task;
        }
        throw new auth_service_1.AppError("Unauthorized", 401);
    }
    /**
     * Update task:
     * - Developer: CAN ONLY update status of assigned tasks
     * - PM: Full update of tasks within owned projects
     * - Admin: Full update of any task
     */
    async updateTask(requestUser, taskId, input) {
        const task = await prisma_1.default.task.findUnique({
            where: { id: taskId },
            include: {
                project: true,
            },
        });
        if (!task) {
            throw new auth_service_1.AppError("Task not found", 404);
        }
        // Developer authorization & constraints
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            if (task.assignedDeveloperId !== requestUser.userId) {
                throw new auth_service_1.AppError("Access denied: You cannot update tasks assigned to other developers", 403);
            }
            // Ensure developer only modifies status
            if (input.title !== undefined ||
                input.description !== undefined ||
                input.assignedDeveloperId !== undefined ||
                input.priority !== undefined ||
                input.dueDate !== undefined) {
                throw new auth_service_1.AppError("Access denied: Developers can only update task status", 403);
            }
            if (!input.status) {
                throw new auth_service_1.AppError("Status is required for developer task update", 400);
            }
            const oldStatus = task.status;
            const newStatus = input.status;
            return prisma_1.default.$transaction(async (tx) => {
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
                    if (newStatus === client_1.TaskStatus.IN_REVIEW) {
                        await tx.notification.create({
                            data: {
                                userId: task.project.createdById,
                                type: client_1.NotificationType.TASK_IN_REVIEW,
                                message: `Task "${task.title}" is ready for review.`,
                            },
                        });
                    }
                }
                return updatedTask;
            });
        }
        // PM authorization check
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER &&
            task.project.createdById !== requestUser.userId) {
            throw new auth_service_1.AppError("Access denied: You cannot update tasks in another PM's project", 403);
        }
        // Admin & PM full update
        const oldStatus = task.status;
        const updateData = {};
        if (input.title !== undefined)
            updateData.title = input.title;
        if (input.description !== undefined)
            updateData.description = input.description;
        if (input.status !== undefined)
            updateData.status = input.status;
        if (input.priority !== undefined)
            updateData.priority = input.priority;
        if (input.dueDate !== undefined)
            updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
        if (input.assignedDeveloperId !== undefined) {
            if (input.assignedDeveloperId) {
                const dev = await prisma_1.default.user.findUnique({
                    where: { id: input.assignedDeveloperId },
                });
                if (!dev || dev.role !== client_1.UserRole.DEVELOPER) {
                    throw new auth_service_1.AppError("Assigned user is not a developer", 400);
                }
            }
            updateData.assignedDeveloperId = input.assignedDeveloperId;
        }
        return prisma_1.default.$transaction(async (tx) => {
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
            if (input.assignedDeveloperId &&
                input.assignedDeveloperId !== task.assignedDeveloperId) {
                await tx.notification.create({
                    data: {
                        userId: input.assignedDeveloperId,
                        type: client_1.NotificationType.TASK_ASSIGNED,
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
    async deleteTask(requestUser, taskId) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError("Access denied: Developers cannot delete tasks", 403);
        }
        const task = await prisma_1.default.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task) {
            throw new auth_service_1.AppError("Task not found", 404);
        }
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER &&
            task.project.createdById !== requestUser.userId) {
            throw new auth_service_1.AppError("Access denied: You cannot delete tasks in another PM's project", 403);
        }
        // Remove associated activity records
        await prisma_1.default.activity.deleteMany({ where: { taskId } });
        return prisma_1.default.task.delete({
            where: { id: taskId },
        });
    }
}
exports.TaskService = TaskService;
exports.taskService = new TaskService();
