import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters"),
  description: z.string().optional().nullable(),
  projectId: z.string().cuid("Project ID must be a valid CUID"),
  assignedDeveloperId: z
    .string()
    .cuid("Developer ID must be a valid CUID")
    .optional()
    .nullable(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  assignedDeveloperId: z
    .string()
    .cuid("Developer ID must be a valid CUID")
    .optional()
    .nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export const taskQuerySchema = z
  .object({
    projectId: z.string().cuid("Project ID must be a valid CUID").optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    from: z
      .string()
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "From must be a valid date",
      )
      .optional(),
    to: z
      .string()
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "To must be a valid date",
      )
      .optional(),
  })
  .superRefine((query, context) => {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "The end date must be on or after the start date",
      });
    }
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
