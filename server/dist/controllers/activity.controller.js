"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityController = exports.ActivityController = void 0;
const activity_service_1 = require("../services/activity.service");
const ApiResponse_1 = require("../utils/ApiResponse");
const auth_service_1 = require("../services/auth.service");
class ActivityController {
    async listActivities(req, res, next) {
        try {
            const projectId = req.query.projectId;
            const activities = await activity_service_1.activityService.listActivities(req.user, projectId);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Activities fetched successfully', activities));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async getNotifications(req, res, next) {
        try {
            const notifications = await activity_service_1.activityService.getNotifications(req.user);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Notifications fetched successfully', notifications));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async markNotificationRead(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const notification = await activity_service_1.activityService.markNotificationRead(req.user, id);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Notification marked as read', notification));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
}
exports.ActivityController = ActivityController;
exports.activityController = new ActivityController();
