import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../services/auth.service';
import { TaskStatus } from '@prisma/client';

export class TaskController {
  async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, status } = req.query;
      const tasks = await taskService.listTasks(req.user!, {
        projectId: projectId as string,
        status: status as TaskStatus,
      });
      res.status(200).json(ApiResponse.success('Tasks fetched successfully', tasks));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.createTask(req.user!, req.body);
      res.status(201).json(ApiResponse.success('Task created successfully', task, 201));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const task = await taskService.getTaskById(req.user!, id);
      res.status(200).json(ApiResponse.success('Task fetched successfully', task));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const task = await taskService.updateTask(req.user!, id, req.body);
      res.status(200).json(ApiResponse.success('Task updated successfully', task));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await taskService.deleteTask(req.user!, id);
      res.status(200).json(ApiResponse.success('Task deleted successfully', null));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }
}

export const taskController = new TaskController();
