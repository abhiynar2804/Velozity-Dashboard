"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = exports.ProjectService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const auth_service_1 = require("./auth.service");
class ProjectService {
    /**
     * List projects with strict RBAC:
     * - Admin: all projects
     * - PM: only their own created projects
     * - Developer: projects where they are assigned tasks (or 403 if general project access is attempted)
     */
    async listProjects(requestUser) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            // Developer can only see projects where they have assigned tasks
            return prisma_1.default.project.findMany({
                where: {
                    tasks: {
                        some: {
                            assignedDeveloperId: requestUser.userId,
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    client: { select: { id: true, name: true } },
                    creator: { select: { id: true, name: true, email: true } },
                    createdAt: true,
                    tasks: {
                        where: { assignedDeveloperId: requestUser.userId },
                        select: { id: true, title: true, status: true, priority: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER) {
            // PM can ONLY see their own projects
            return prisma_1.default.project.findMany({
                where: {
                    createdById: requestUser.userId,
                },
                include: {
                    client: true,
                    creator: { select: { id: true, name: true, email: true } },
                    _count: {
                        select: { tasks: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        // Admin sees all projects
        return prisma_1.default.project.findMany({
            include: {
                client: true,
                creator: { select: { id: true, name: true, email: true } },
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Create a project (Admin or PM)
     */
    async createProject(requestUser, input) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError('Access denied: Developers cannot create projects', 403);
        }
        const client = await prisma_1.default.client.findUnique({ where: { id: input.clientId } });
        if (!client) {
            throw new auth_service_1.AppError('Client not found', 404);
        }
        return prisma_1.default.project.create({
            data: {
                name: input.name,
                description: input.description,
                clientId: input.clientId,
                createdById: requestUser.userId,
            },
            include: {
                client: true,
                creator: { select: { id: true, name: true, email: true } },
            },
        });
    }
    /**
     * Get project by ID with strict ownership validation
     */
    async getProjectById(requestUser, projectId) {
        const project = await prisma_1.default.project.findUnique({
            where: { id: projectId },
            include: {
                client: true,
                creator: { select: { id: true, name: true, email: true } },
                tasks: {
                    include: {
                        assignedDeveloper: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });
        if (!project) {
            throw new auth_service_1.AppError('Project not found', 404);
        }
        // RBAC and Ownership Check:
        if (requestUser.role === client_1.UserRole.ADMIN) {
            return project;
        }
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER) {
            if (project.createdById !== requestUser.userId) {
                throw new auth_service_1.AppError('Access denied: You cannot view projects managed by other Project Managers', 403);
            }
            return project;
        }
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            // Check if developer has any assigned tasks in this project
            const hasTask = project.tasks.some((t) => t.assignedDeveloperId === requestUser.userId);
            if (!hasTask) {
                throw new auth_service_1.AppError('Access denied: You are not assigned to any tasks in this project', 403);
            }
            // Filter tasks to only assigned tasks for this developer
            return {
                ...project,
                tasks: project.tasks.filter((t) => t.assignedDeveloperId === requestUser.userId),
            };
        }
        throw new auth_service_1.AppError('Unauthorized', 401);
    }
    /**
     * Update project (Admin or owning PM)
     */
    async updateProject(requestUser, projectId, input) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError('Access denied: Developers cannot update projects', 403);
        }
        const project = await prisma_1.default.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new auth_service_1.AppError('Project not found', 404);
        }
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER && project.createdById !== requestUser.userId) {
            throw new auth_service_1.AppError('Access denied: You cannot update projects managed by other Project Managers', 403);
        }
        return prisma_1.default.project.update({
            where: { id: projectId },
            data: {
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
            },
            include: {
                client: true,
                creator: { select: { id: true, name: true, email: true } },
            },
        });
    }
    /**
     * Delete project (Admin or owning PM)
     */
    async deleteProject(requestUser, projectId) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError('Access denied: Developers cannot delete projects', 403);
        }
        const project = await prisma_1.default.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new auth_service_1.AppError('Project not found', 404);
        }
        if (requestUser.role === client_1.UserRole.PROJECT_MANAGER && project.createdById !== requestUser.userId) {
            throw new auth_service_1.AppError('Access denied: You cannot delete projects managed by other Project Managers', 403);
        }
        return prisma_1.default.project.delete({
            where: { id: projectId },
        });
    }
}
exports.ProjectService = ProjectService;
exports.projectService = new ProjectService();
