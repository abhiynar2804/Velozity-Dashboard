import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import { AppError } from "./auth.service";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.validator";
import { AccessTokenPayload } from "../utils/token.utils";

export class ProjectService {
  /**
   * List projects with strict RBAC:
   * - Admin: all projects
   * - PM: only their own created projects
   * - Developer: projects where they are assigned tasks (or 403 if general project access is attempted)
   */
  async listProjects(requestUser: AccessTokenPayload) {
    if (requestUser.role === UserRole.DEVELOPER) {
      // Developer can only see projects where they have assigned tasks
      return prisma.project.findMany({
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
        orderBy: { createdAt: "desc" },
      });
    }

    if (requestUser.role === UserRole.PROJECT_MANAGER) {
      // PM can ONLY see their own projects
      return prisma.project.findMany({
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
        orderBy: { createdAt: "desc" },
      });
    }

    // Admin sees all projects
    return prisma.project.findMany({
      include: {
        client: true,
        creator: { select: { id: true, name: true, email: true } },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create a project (Admin or PM)
   */
  async createProject(
    requestUser: AccessTokenPayload,
    input: CreateProjectInput,
  ) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError(
        "Access denied: Developers cannot create projects",
        403,
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
    });
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    return prisma.project.create({
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
  async getProjectById(requestUser: AccessTokenPayload, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        creator: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignedDeveloper: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    // RBAC and Ownership Check:
    if (requestUser.role === UserRole.ADMIN) {
      return project;
    }

    if (requestUser.role === UserRole.PROJECT_MANAGER) {
      if (project.createdById !== requestUser.userId) {
        throw new AppError(
          "Access denied: You cannot view projects managed by other Project Managers",
          403,
        );
      }
      return project;
    }

    if (requestUser.role === UserRole.DEVELOPER) {
      // Check if developer has any assigned tasks in this project
      const hasTask = project.tasks.some(
        (t) => t.assignedDeveloperId === requestUser.userId,
      );
      if (!hasTask) {
        throw new AppError(
          "Access denied: You are not assigned to any tasks in this project",
          403,
        );
      }

      // Filter tasks to only assigned tasks for this developer
      return {
        ...project,
        tasks: project.tasks.filter(
          (t) => t.assignedDeveloperId === requestUser.userId,
        ),
      };
    }

    throw new AppError("Unauthorized", 401);
  }

  /**
   * Update project (Admin or owning PM)
   */
  async updateProject(
    requestUser: AccessTokenPayload,
    projectId: string,
    input: UpdateProjectInput,
  ) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError(
        "Access denied: Developers cannot update projects",
        403,
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new AppError("Project not found", 404);
    }

    if (
      requestUser.role === UserRole.PROJECT_MANAGER &&
      project.createdById !== requestUser.userId
    ) {
      throw new AppError(
        "Access denied: You cannot update projects managed by other Project Managers",
        403,
      );
    }

    if (input.clientId !== undefined) {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
      });
      if (!client) {
        throw new AppError("Client not found", 404);
      }
    }

    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
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
  async deleteProject(requestUser: AccessTokenPayload, projectId: string) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError(
        "Access denied: Developers cannot delete projects",
        403,
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new AppError("Project not found", 404);
    }

    if (
      requestUser.role === UserRole.PROJECT_MANAGER &&
      project.createdById !== requestUser.userId
    ) {
      throw new AppError(
        "Access denied: You cannot delete projects managed by other Project Managers",
        403,
      );
    }

    return prisma.project.delete({
      where: { id: projectId },
    });
  }
}

export const projectService = new ProjectService();
