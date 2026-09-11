import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../services/auth.service';

export class UserController {
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers(req.user!);
      res.status(200).json(ApiResponse.success('Users fetched successfully', users));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const newUser = await userService.createUser(req.user!, req.body);
      res.status(201).json(ApiResponse.success('User created successfully', newUser, 201));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await userService.getUserById(req.user!, id);
      res.status(200).json(ApiResponse.success('User fetched successfully', user));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await userService.updateUser(req.user!, id, req.body);
      res.status(200).json(ApiResponse.success('User updated successfully', updated));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await userService.deleteUser(req.user!, id);
      res.status(200).json(ApiResponse.success('User deleted successfully', null));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }
}

export const userController = new UserController();
