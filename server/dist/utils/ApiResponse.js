"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    success;
    message;
    data;
    statusCode;
    constructor(success, message, statusCode, data) {
        this.success = success;
        this.message = message;
        this.statusCode = statusCode;
        if (data !== undefined) {
            this.data = data;
        }
    }
    static success(message, data, statusCode = 200) {
        return new ApiResponse(true, message, statusCode, data);
    }
    static error(message, statusCode = 500, data) {
        return new ApiResponse(false, message, statusCode, data);
    }
}
exports.ApiResponse = ApiResponse;
