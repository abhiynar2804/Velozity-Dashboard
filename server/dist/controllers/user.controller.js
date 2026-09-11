"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
const ApiResponse_1 = require("../utils/ApiResponse");
const auth_service_1 = require("../services/auth.service");
class UserController {
    async listUsers(req, res, next) {
        try {
            const users = await user_service_1.userService.listUsers(req.user);
            res.status(200).json(ApiResponse_1.ApiResponse.success('Users fetched successfully', users));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async createUser(req, res, next) {
        try {
            const newUser = await user_service_1.userService.createUser(req.user, req.body);
            res.status(201).json(ApiResponse_1.ApiResponse.success('User created successfully', newUser, 201));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async getUserById(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const user = await user_service_1.userService.getUserById(req.user, id);
            res.status(200).json(ApiResponse_1.ApiResponse.success('User fetched successfully', user));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async updateUser(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const updated = await user_service_1.userService.updateUser(req.user, id, req.body);
            res.status(200).json(ApiResponse_1.ApiResponse.success('User updated successfully', updated));
        }
        catch (error) {
            if (error instanceof auth_service_1.AppError) {
                res.status(error.statusCode).json(ApiResponse_1.ApiResponse.error(error.message, error.statusCode));
                return;
            }
            next(error);
        }
    }
    async deleteUser(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await user_service_1.userService.deleteUser(req.user, id);
            res.status(200).json(ApiResponse_1.ApiResponse.success('User deleted successfully', null));
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
exports.UserController = UserController;
exports.userController = new UserController();
