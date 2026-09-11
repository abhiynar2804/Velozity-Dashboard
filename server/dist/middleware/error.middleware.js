"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json(ApiResponse_1.ApiResponse.error(message, statusCode));
};
exports.errorHandler = errorHandler;
