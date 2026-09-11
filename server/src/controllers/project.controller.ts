import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../services/auth.service';

export class ProjectController {
  async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await projectService.listProjects(req.user!);
      res.status(200).json(ApiResponse.success('Projects fetched successfully', projects));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.createProject(req.user!, req.body);
      res.status(201).json(ApiResponse.success('Project created successfully', project, 201));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const project = await projectService.getProjectById(req.user!, id);
      res.status(200).json(ApiResponse.success('Project fetched successfully', project));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const project = await projectService.updateProject(req.user!, id, req.body);
      res.status(200).json(ApiResponse.success('Project updated successfully', project));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await projectService.deleteProject(req.user!, id);
      res.status(200).json(ApiResponse.success('Project deleted successfully', null));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }
}

export const projectController = new ProjectController();
