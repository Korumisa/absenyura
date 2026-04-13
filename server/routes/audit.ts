import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['SUPER_ADMIN']));

router.get('/', getAuditLogs);

export default router;