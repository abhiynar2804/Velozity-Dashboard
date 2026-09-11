"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_validator_1 = require("../validators/auth.validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', (0, auth_validator_1.validate)(auth_validator_1.registerSchema), (req, res, next) => auth_controller_1.authController.register(req, res, next));
router.post('/login', (0, auth_validator_1.validate)(auth_validator_1.loginSchema), (req, res, next) => auth_controller_1.authController.login(req, res, next));
router.post('/refresh', (req, res, next) => auth_controller_1.authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => auth_controller_1.authController.logout(req, res, next));
// Protected routes
router.get('/me', auth_middleware_1.authenticate, (req, res, next) => auth_controller_1.authController.getMe(req, res, next));
exports.default = router;
