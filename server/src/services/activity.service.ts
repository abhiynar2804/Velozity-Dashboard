import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import { AppError } from "./auth.service";
import { AccessTokenPayload } from "../utils/token.utils";

export class ActivityService {
  /**
   * List activities scoped by role:
   * - Admin: all activities
   * - PM: activities on projects owned by this PM
   * - Developer: activities on tasks assigned to this Developer
   */
  async listActivities(requestUser: AccessTokenPayload, projectId?: string) {
    let whereClause: any = {};

    if (requestUser.role === UserRole.DEVELOPER) {
      whereClause.task = {
        assignedDeveloperId: requestUser.userId,
      };
    } else if (requestUser.role === UserRole.PROJECT_MANAGER) {
      whereClause.project = {
        createdById: requestUser.userId,
      };
    }

    if (projectId) {
      whereClause.projectId = projectId;
    }

    return prisma.activity.findMany({
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
  async getNotifications(requestUser: AccessTokenPayload) {
    return prisma.notification.findMany({
      where: { userId: requestUser.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(
    requestUser: AccessTokenPayload,
    notificationId: string,
  ) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (notification.userId !== requestUser.userId) {
      throw new AppError("Access denied", 403);
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }
}

export const activityService = new ActivityService();
