import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validate } from '../validators/auth.validator';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => userController.listUsers(req, res, next));
router.post('/', requireRoles(UserRole.ADMIN), validate(createUserSchema), (req, res, next) =>
  userController.createUser(req, res, next)
);
router.get('/:id', (req, res, next) => userController.getUserById(req, res, next));
router.patch('/:id', requireRoles(UserRole.ADMIN), validate(updateUserSchema), (req, res, next) =>
  userController.updateUser(req, res, next)
);
router.delete('/:id', requireRoles(UserRole.ADMIN), (req, res, next) => userController.deleteUser(req, res, next));

export default router;
