"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = exports.ProjectController = void 0;
const project_service_1 = require("../services/project.service");
const ApiResponse_1 = require("../utils/ApiResponse");
const auth_service_1 = require("../services/auth.service");
class ProjectController {
    async listProjects(req, res, next) {
        try {
            const projects = await project_service_1.projectService.listProjects(req.user);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Projects fetched successfully', projects));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async createProject(req, res, next) {
        try {
            const project = await project_service_1.projectService.createProject(req.user, req.body);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Project created successfully', project, 201));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async getProjectById(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const project = await project_service_1.projectService.getProjectById(req.user, id);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Project fetched successfully', project));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async updateProject(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const project = await project_service_1.projectService.updateProject(req.user, id, req.body);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Project updated successfully', project));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async deleteProject(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await project_service_1.projectService.deleteProject(req.user, id);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Project deleted successfully', null));
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
exports.ProjectController = ProjectController;
exports.projectController = new ProjectController();
