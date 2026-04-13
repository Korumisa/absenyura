import { Router } from 'express';
import { getReports } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/', getReports);

export default router;