"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParamSchema = exports.validateParams = exports.validateQuery = exports.validate = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const ApiResponse_1 = require("../utils/ApiResponse");
const client_1 = require("@prisma/client");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters long').max(100),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long').max(100),
    role: zod_1.z.nativeEnum(client_1.UserRole).optional().default(client_1.UserRole.DEVELOPER),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
                res.status(400).json(ApiResponse_1.ApiResponse.error(errorMessages, 400, error.issues));
                return;
            }
            next(error);
        }
    };
};
exports.validate = validate;
const validateQuery = (schema) => {
    return async (req, res, next) => {
        try {
            req.query = await schema.parseAsync(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
                res.status(400).json(ApiResponse_1.ApiResponse.error(errorMessages, 400, error.issues));
                return;
            }
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return async (req, res, next) => {
        try {
            req.params = await schema.parseAsync(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
                res.status(400).json(ApiResponse_1.ApiResponse.error(errorMessages, 400, error.issues));
                return;
            }
            next(error);
        }
    };
};
exports.validateParams = validateParams;
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().cuid('ID must be a valid CUID'),
});
