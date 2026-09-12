"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientService = exports.ClientService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const auth_service_1 = require("./auth.service");
class ClientService {
    /**
     * List clients
     * - Admin: all clients with projects count
     * - Project Manager: clients list for project assignment
     * - Developer: Forbidden
     */
    async listClients(requestUser) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError('Access denied: Developers cannot view client lists', 403);
        }
        return prisma_1.default.client.findMany({
            include: {
                _count: {
                    select: { projects: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Admin only: Create client
     */
    async createClient(requestUser, input) {
        if (requestUser.role !== client_1.UserRole.ADMIN) {
            throw new auth_service_1.AppError('Access denied: Only Admins can manage clients', 403);
        }
        return prisma_1.default.client.create({
            data: {
                name: input.name,
                email: input.email,
                company: input.company,
            },
        });
    }
    /**
     * Get client by ID
     */
    async getClientById(requestUser, clientId) {
        if (requestUser.role === client_1.UserRole.DEVELOPER) {
            throw new auth_service_1.AppError('Access denied: Developers cannot view client details', 403);
        }
        const client = await prisma_1.default.client.findUnique({
            where: { id: clientId },
            include: {
                projects: {
                    select: {
                        id: true,
                        name: true,
                        createdById: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!client) {
            throw new auth_service_1.AppError('Client not found', 404);
        }
        return client;
    }
    /**
     * Admin only: Update client
     */
    async updateClient(requestUser, clientId, input) {
        if (requestUser.role !== client_1.UserRole.ADMIN) {
            throw new auth_service_1.AppError('Access denied: Only Admins can edit clients', 403);
        }
        const client = await prisma_1.default.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new auth_service_1.AppError('Client not found', 404);
        }
        return prisma_1.default.client.update({
            where: { id: clientId },
            data: {
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.email !== undefined ? { email: input.email } : {}),
                ...(input.company !== undefined ? { company: input.company } : {}),
            },
        });
    }
    /**
     * Admin only: Delete client
     */
    async deleteClient(requestUser, clientId) {
        if (requestUser.role !== client_1.UserRole.ADMIN) {
            throw new auth_service_1.AppError('Access denied: Only Admins can delete clients', 403);
        }
        const client = await prisma_1.default.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new auth_service_1.AppError('Client not found', 404);
        }
        return prisma_1.default.client.delete({
            where: { id: clientId },
        });
    }
}
exports.ClientService = ClientService;
exports.clientService = new ClientService();
