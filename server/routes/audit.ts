import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.js';
import { AuditLogQuery } from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['SUPER_ADMIN']));

router.get('/', validateQuery(AuditLogQuery), getAuditLogs);

export default router;
