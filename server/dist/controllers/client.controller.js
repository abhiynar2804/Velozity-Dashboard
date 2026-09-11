"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientController = exports.ClientController = void 0;
const client_service_1 = require("../services/client.service");
const ApiResponse_1 = require("../utils/ApiResponse");
const auth_service_1 = require("../services/auth.service");
class ClientController {
    async listClients(req, res, next) {
        try {
            const clients = await client_service_1.clientService.listClients(req.user);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Clients fetched successfully', clients));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async createClient(req, res, next) {
        try {
            const client = await client_service_1.clientService.createClient(req.user, req.body);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Client created successfully', client, 201));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async getClientById(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const client = await client_service_1.clientService.getClientById(req.user, id);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Client fetched successfully', client));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async updateClient(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const client = await client_service_1.clientService.updateClient(req.user, id, req.body);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Client updated successfully', client));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async deleteClient(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await client_service_1.clientService.deleteClient(req.user, id);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Client deleted successfully', null));
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
exports.ClientController = ClientController;
exports.clientController = new ClientController();
