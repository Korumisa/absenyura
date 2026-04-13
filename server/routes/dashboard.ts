import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getDashboardStats);

export default router;