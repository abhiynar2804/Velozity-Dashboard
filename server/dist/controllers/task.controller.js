"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskController = exports.TaskController = void 0;
const task_service_1 = require("../services/task.service");
const ApiResponse_1 = require("../utils/ApiResponse");
const auth_service_1 = require("../services/auth.service");
class TaskController {
    async listTasks(req, res, next) {
        try {
            const { projectId, status, priority, from, to } = req.query;
            const tasks = await task_service_1.taskService.listTasks(req.user, {
                projectId,
                status,
                priority,
                from,
                to,
            });
            res
                .status(200)
                .json(ApiResponse_1.ApiResponse.success("Tasks fetched successfully", tasks));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res
                    .status(error.statusCode)
                    .json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async createTask(req, res, next) {
        try {
            const task = await task_service_1.taskService.createTask(req.user, req.body);
            res
                .status(201)
                .json(ApiResponse_1.ApiResponse.success("Task created successfully", task, 201));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res
                    .status(error.statusCode)
                    .json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async getTaskById(req, res, next) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const task = await task_service_1.taskService.getTaskById(req.user, id);
            res
                .status(200)
                .json(ApiResponse_1.ApiResponse.success("Task fetched successfully", task));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res
                    .status(error.statusCode)
                    .json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async updateTask(req, res, next) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const task = await task_service_1.taskService.updateTask(req.user, id, req.body);
            res
                .status(200)
                .json(ApiResponse_1.ApiResponse.success("Task updated successfully", task));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res
                    .status(error.statusCode)
                    .json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async deleteTask(req, res, next) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            await task_service_1.taskService.deleteTask(req.user, id);
            res
                .status(200)
                .json(ApiResponse_1.ApiResponse.success("Task deleted successfully", null));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res
                    .status(error.statusCode)
                    .json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
}
exports.TaskController = TaskController;
exports.taskController = new TaskController();
