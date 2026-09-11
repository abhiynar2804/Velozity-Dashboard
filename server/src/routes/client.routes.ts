import { Router } from 'express';
import { clientController } from '../controllers/client.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validate } from '../validators/auth.validator';
import { createClientSchema, updateClientSchema } from '../validators/client.validator';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', requireRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER), (req, res, next) =>
  clientController.listClients(req, res, next)
);
router.post(
  '/',
  requireRoles(UserRole.ADMIN),
  validate(createClientSchema),
  (req, res, next) => clientController.createClient(req, res, next)
);
router.get('/:id', requireRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER), (req, res, next) =>
  clientController.getClientById(req, res, next)
);
router.patch(
  '/:id',
  requireRoles(UserRole.ADMIN),
  validate(updateClientSchema),
  (req, res, next) => clientController.updateClient(req, res, next)
);
router.delete('/:id', requireRoles(UserRole.ADMIN), (req, res, next) =>
  clientController.deleteClient(req, res, next)
);

export default router;
