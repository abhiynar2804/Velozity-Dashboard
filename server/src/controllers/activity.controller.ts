import { Request, Response, NextFunction } from "express";
import { activityService } from "../services/activity.service";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../services/auth.service";

export class ActivityController {
  async listActivities(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;
      const activities = await activityService.listActivities(
        req.user!,
        projectId,
      );
      res
        .status(200)
        .json(
          ApiResponse.success("Activities fetched successfully", activities),
        );
    } catch (error) {
      if (error instanceof AppError) {
        res
          .status(error.statusCode)
          .json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async getNotifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const notifications = await activityService.getNotifications(req.user!);
      res
        .status(200)
        .json(
          ApiResponse.success(
            "Notifications fetched successfully",
            notifications,
          ),
        );
    } catch (error) {
      if (error instanceof AppError) {
        res
          .status(error.statusCode)
          .json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async markNotificationRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const notification = await activityService.markNotificationRead(
        req.user!,
        id,
      );
      res
        .status(200)
        .json(ApiResponse.success("Notification marked as read", notification));
    } catch (error) {
      if (error instanceof AppError) {
        res
          .status(error.statusCode)
          .json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async markAllNotificationsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await activityService.markAllNotificationsRead(req.user!);
      res
        .status(200)
        .json(ApiResponse.success("All notifications marked as read", result));
    } catch (error) {
      if (error instanceof AppError) {
        res
          .status(error.statusCode)
          .json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }
}

export const activityController = new ActivityController();
