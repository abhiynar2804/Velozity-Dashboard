import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { UserRole } from "@prisma/client";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const validate = (schema: z.ZodSchema) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        res
          .status(400)
          .json(ApiResponse.error(errorMessages, 400, error.issues));
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as Request["query"];
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        res
          .status(400)
          .json(ApiResponse.error(errorMessages, 400, error.issues));
        return;
      }
      next(error);
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      req.params = (await schema.parseAsync(req.params)) as Request["params"];
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        res
          .status(400)
          .json(ApiResponse.error(errorMessages, 400, error.issues));
        return;
      }
      next(error);
    }
  };
};

export const idParamSchema = z.object({
  id: z.string().cuid("ID must be a valid CUID"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
