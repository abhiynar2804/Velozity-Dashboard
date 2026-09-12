import { Router } from "express";
import { activityController } from "../controllers/activity.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", (req, res, next) =>
  activityController.listActivities(req, res, next),
);
router.get("/notifications", (req, res, next) =>
  activityController.getNotifications(req, res, next),
);
router.patch("/notifications/read-all", (req, res, next) =>
  activityController.markAllNotificationsRead(req, res, next),
);
router.patch("/notifications/:id/read", (req, res, next) =>
  activityController.markNotificationRead(req, res, next),
);

export default router;
