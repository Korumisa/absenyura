import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.js';
import { DashboardQuery } from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(DashboardQuery), getDashboardStats);

export default router;
