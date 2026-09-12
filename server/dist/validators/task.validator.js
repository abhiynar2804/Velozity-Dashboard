"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQuerySchema = exports.updateTaskStatusSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, "Task title must be at least 2 characters"),
    description: zod_1.z.string().optional().nullable(),
    projectId: zod_1.z.string().cuid("Project ID must be a valid CUID"),
    assignedDeveloperId: zod_1.z
        .string()
        .cuid("Developer ID must be a valid CUID")
        .optional()
        .nullable(),
    priority: zod_1.z.nativeEnum(client_1.TaskPriority).default(client_1.TaskPriority.MEDIUM),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
});
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional().nullable(),
    assignedDeveloperId: zod_1.z
        .string()
        .cuid("Developer ID must be a valid CUID")
        .optional()
        .nullable(),
    status: zod_1.z.nativeEnum(client_1.TaskStatus).optional(),
    priority: zod_1.z.nativeEnum(client_1.TaskPriority).optional(),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
});
exports.updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.TaskStatus),
});
exports.taskQuerySchema = zod_1.z
    .object({
    projectId: zod_1.z.string().cuid("Project ID must be a valid CUID").optional(),
    status: zod_1.z.nativeEnum(client_1.TaskStatus).optional(),
    priority: zod_1.z.nativeEnum(client_1.TaskPriority).optional(),
    from: zod_1.z
        .string()
        .refine((value) => !Number.isNaN(Date.parse(value)), "From must be a valid date")
        .optional(),
    to: zod_1.z
        .string()
        .refine((value) => !Number.isNaN(Date.parse(value)), "To must be a valid date")
        .optional(),
})
    .superRefine((query, context) => {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["to"],
            message: "The end date must be on or after the start date",
        });
    }
});
