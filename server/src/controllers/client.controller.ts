import { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/client.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../services/auth.service';

export class ClientController {
  async listClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await clientService.listClients(req.user!);
      res.status(200).json(ApiResponse.success('Clients fetched successfully', clients));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.createClient(req.user!, req.body);
      res.status(201).json(ApiResponse.success('Client created successfully', client, 201));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async getClientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const client = await clientService.getClientById(req.user!, id);
      res.status(200).json(ApiResponse.success('Client fetched successfully', client));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const client = await clientService.updateClient(req.user!, id, req.body);
      res.status(200).json(ApiResponse.success('Client updated successfully', client));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }

  async deleteClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await clientService.deleteClient(req.user!, id);
      res.status(200).json(ApiResponse.success('Client deleted successfully', null));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
        return;
      }
      next(error);
    }
  }
}

export const clientController = new ClientController();
