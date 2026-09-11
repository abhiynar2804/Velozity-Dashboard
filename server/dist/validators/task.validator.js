"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskStatusSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Task title must be at least 2 characters'),
    description: zod_1.z.string().optional().nullable(),
    projectId: zod_1.z.string().min(1, 'Project ID is required'),
    assignedDeveloperId: zod_1.z.string().optional().nullable(),
    priority: zod_1.z.nativeEnum(client_1.TaskPriority).default(client_1.TaskPriority.MEDIUM),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
});
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional().nullable(),
    assignedDeveloperId: zod_1.z.string().optional().nullable(),
    status: zod_1.z.nativeEnum(client_1.TaskStatus).optional(),
    priority: zod_1.z.nativeEnum(client_1.TaskPriority).optional(),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
});
exports.updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.TaskStatus),
});
