import { Router } from 'express';
import { updateProfile } from '../controllers/settings.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.put('/profile', updateProfile);

export default router;