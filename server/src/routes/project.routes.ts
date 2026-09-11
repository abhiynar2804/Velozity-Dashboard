import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validate } from '../validators/auth.validator';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => projectController.listProjects(req, res, next));
router.post(
  '/',
  requireRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  validate(createProjectSchema),
  (req, res, next) => projectController.createProject(req, res, next)
);
router.get('/:id', (req, res, next) => projectController.getProjectById(req, res, next));
router.patch(
  '/:id',
  requireRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  validate(updateProjectSchema),
  (req, res, next) => projectController.updateProject(req, res, next)
);
router.delete(
  '/:id',
  requireRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  (req, res, next) => projectController.deleteProject(req, res, next)
);

export default router;
