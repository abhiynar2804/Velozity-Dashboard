"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityService = exports.ActivityService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const auth_service_1 = require("./auth.service");
class ActivityService {
    /**
     * List activities scoped by role:
     * - Admin: all activities
     * - PM: activities on projects owned by this PM
     * - Developer: activities on tasks assigned to this Developer
     */
    async listActivities(requestUser, projectId) {
        let whereClause = {};
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            whereClause.task = {
                assignedDeveloperId: requestUser.userId,
            };
        }
        else if (requestUser.role === client_1.UserRole.PROJECT_MANAGER) {
            whereClause.project = {
                createdById: requestUser.userId,
            };
        }
        if (projectId) {
            whereClause.projectId = projectId;
        }
        return prisma_1.default.activity.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
                project: { select: { id: true, name: true } },
                task: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
    }
    /**
     * Get notifications for the authenticated user
     */
    async getNotifications(requestUser) {
        return prisma_1.default.notification.findMany({
            where: { userId: requestUser.userId },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
    }
    /**
     * Mark notification as read
     */
    async markNotificationRead(requestUser, notificationId) {
        const notification = await prisma_1.default.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new auth_service_1.AppError("Notification not found", 404);
        }
        if (notification.userId !== requestUser.userId) {
            throw new auth_service_1.AppError("Access denied", 403);
        }
        return prisma_1.default.notification.update({
            where: { id: notificationId },
            data: { read: true },
        });
    }
    /**
     * Mark every unread notification belonging to the authenticated user as read.
     */
    async markAllNotificationsRead(requestUser) {
        return prisma_1.default.notification.updateMany({
            where: {
                userId: requestUser.userId,
                read: false,
            },
            data: { read: true },
        });
    }
}
exports.ActivityService = ActivityService;
exports.activityService = new ActivityService();
