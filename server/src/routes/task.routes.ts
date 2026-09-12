import { Router } from "express";
import { taskController } from "../controllers/task.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";
import {
  idParamSchema,
  validate,
  validateParams,
  validateQuery,
} from "../validators/auth.validator";
import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
} from "../validators/task.validator";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(taskQuerySchema), (req, res, next) =>
  taskController.listTasks(req, res, next),
);
router.post(
  "/",
  requireRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  validate(createTaskSchema),
  (req, res, next) => taskController.createTask(req, res, next),
);
router.get("/:id", validateParams(idParamSchema), (req, res, next) =>
  taskController.getTaskById(req, res, next),
);
router.patch(
  "/:id",
  validateParams(idParamSchema),
  validate(updateTaskSchema),
  (req, res, next) => taskController.updateTask(req, res, next),
);
router.delete(
  "/:id",
  requireRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  validateParams(idParamSchema),
  (req, res, next) => taskController.deleteTask(req, res, next),
);

export default router;
