import prisma from '../utils/prisma';
import { UserRole } from '@prisma/client';
import { AppError } from './auth.service';
import { CreateClientInput, UpdateClientInput } from '../validators/client.validator';
import { AccessTokenPayload } from '../utils/token.utils';

export class ClientService {
  /**
   * List clients
   * - Admin: all clients with projects count
   * - Project Manager: clients list for project assignment
   * - Developer: Forbidden
   */
  async listClients(requestUser: AccessTokenPayload) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError('Access denied: Developers cannot view client lists', 403);
    }

    return prisma.client.findMany({
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
  async createClient(requestUser: AccessTokenPayload, input: CreateClientInput) {
    if (requestUser.role !== UserRole.ADMIN) {
      throw new AppError('Access denied: Only Admins can manage clients', 403);
    }

    return prisma.client.create({
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
  async getClientById(requestUser: AccessTokenPayload, clientId: string) {
    if (requestUser.role === UserRole.DEVELOPER) {
      throw new AppError('Access denied: Developers cannot view client details', 403);
    }

    const client = await prisma.client.findUnique({
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
      throw new AppError('Client not found', 404);
    }

    return client;
  }

  /**
   * Admin only: Update client
   */
  async updateClient(requestUser: AccessTokenPayload, clientId: string, input: UpdateClientInput) {
    if (requestUser.role !== UserRole.ADMIN) {
      throw new AppError('Access denied: Only Admins can edit clients', 403);
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    return prisma.client.update({
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
  async deleteClient(requestUser: AccessTokenPayload, clientId: string) {
    if (requestUser.role !== UserRole.ADMIN) {
      throw new AppError('Access denied: Only Admins can delete clients', 403);
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    return prisma.client.delete({
      where: { id: clientId },
    });
  }
}

export const clientService = new ClientService();
