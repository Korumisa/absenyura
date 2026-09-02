import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateParams } from '../middlewares/validate.js';
import { NotificationParams } from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', validateParams(NotificationParams), markAsRead);

export default router;
