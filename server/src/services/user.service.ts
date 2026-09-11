import prisma from '../utils/prisma';
import { UserRole } from '@prisma/client';
import { AppError } from './auth.service';
import { hashPassword } from '../utils/password.utils';
import { CreateUserInput, UpdateUserInput } from '../validators/user.validator';
import { AccessTokenPayload } from '../utils/token.utils';

export class UserService {
  /**
   * List users according to role permissions
   * - Admin: all users
   * - Project Manager: developers only (for task assignment)
   * - Developer: Forbidden
   */
  async listUsers(requestUser: AccessTokenPayload) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError('Access denied: Developers cannot view user directories', 403);
    }

    const whereClause =
      requestUser.role === UserRole.PROJECT_MANAGER
        ? { role: UserRole.DEVELOPER }
        : {};

    return prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projectsCreated: true,
            assignedTasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin only: Create a new user with defined role
   */
  async createUser(requestUser: AccessTokenPayload, input: CreateUserInput) {
    if (requestUser.role !== UserRole.ADMIN) {
      throw new AppError('Access denied: Admin privileges required', 403);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('Email is already in use', 409);
    }

    const passwordHash = await hashPassword(input.password);

    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get user by ID (Admin or Self)
   */
  async getUserById(requestUser: AccessTokenPayload, userId: string) {
    if (requestUser.role !== UserRole.ADMIN && requestUser.userId !== userId) {
      throw new AppError('Access denied: You can only access your own profile', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * Admin only: Update user
   */
  async updateUser(requestUser: AccessTokenPayload, userId: string, input: UpdateUserInput) {
    if (requestUser.role !== UserRole.ADMIN) {
      throw new AppError('Access denied: Admin privileges required', 403);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.role ? { role: input.role } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Admin only: Delete user
   */
  async deleteUser(requestUser: AccessTokenPayload, userId: string) {
    if (requestUser.role !== UserRole.ADMIN) {
      throw new AppError('Access denied: Admin privileges required', 403);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.id === requestUser.userId) {
      throw new AppError('Cannot delete your own administrative account', 400);
    }

    // Clean up related data
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.task.updateMany({
      where: { assignedDeveloperId: userId },
      data: { assignedDeveloperId: null },
    });

    return prisma.user.delete({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }
}

export const userService = new UserService();
