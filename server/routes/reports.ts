import { Router } from 'express';
import { getReports } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.js';
import { ReportQuery } from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);
router.get('/', validateQuery(ReportQuery), getReports);

export default router;
