"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const auth_service_1 = require("./auth.service");
const password_utils_1 = require("../utils/password.utils");
class UserService {
    /**
     * List users according to role permissions
     * - Admin: all users
     * - Project Manager: developers only (for task assignment)
     * - Developer: Forbidden
     */
    async listUsers(requestUser) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError('Access denied: Developers cannot view user directories', 403);
        }
        const whereClause = requestUser.role === client_1.UserRole.PROJECT_MANAGER
            ? { role: client_1.UserRole.DEVELOPER }
            : {};
        return prisma_1.default.user.findMany({
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
    async createUser(requestUser, input) {
        if (requestUser.role !== client_1.UserRole.ADMIN) {
            throw new auth_service_1.AppError('Access denied: Admin privileges required', 403);
        }
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email: input.email.toLowerCase() },
        });
        if (existingUser) {
            throw new auth_service_1.AppError('Email is already in use', 409);
        }
        const passwordHash = await (0, password_utils_1.hashPassword)(input.password);
        return prisma_1.default.user.create({
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
    async getUserById(requestUser, userId) {
        if (requestUser.role !== client_1.UserRole.ADMIN && requestUser.userId !== userId) {
            throw new auth_service_1.AppError('Access denied: You can only access your own profile', 403);
        }
        const user = await prisma_1.default.user.findUnique({
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
            throw new auth_service_1.AppError('User not found', 404);
        }
        return user;
    }
    /**
     * Admin only: Update user
     */
    async updateUser(requestUser, userId, input) {
        if (requestUser.role !== client_1.UserRole.ADMIN) {
            throw new auth_service_1.AppError('Access denied: Admin privileges required', 403);
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new auth_service_1.AppError('User not found', 404);
        }
        return prisma_1.default.user.update({
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
    async deleteUser(requestUser, userId) {
        if (requestUser.role !== client_1.UserRole.ADMIN) {
            throw new auth_service_1.AppError('Access denied: Admin privileges required', 403);
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new auth_service_1.AppError('User not found', 404);
        }
        if (user.id === requestUser.userId) {
            throw new auth_service_1.AppError('Cannot delete your own administrative account', 400);
        }
        // Clean up related data
        await prisma_1.default.refreshToken.deleteMany({ where: { userId } });
        await prisma_1.default.notification.deleteMany({ where: { userId } });
        await prisma_1.default.activity.deleteMany({ where: { userId } });
        await prisma_1.default.task.updateMany({
            where: { assignedDeveloperId: userId },
            data: { assignedDeveloperId: null },
        });
        return prisma_1.default.user.delete({
            where: { id: userId },
            select: { id: true, email: true },
        });
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
