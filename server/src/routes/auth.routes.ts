import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate, registerSchema, loginSchema } from '../validators/auth.validator';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Protected routes
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

export default router;
