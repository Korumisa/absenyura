import { Router } from 'express';
import { updateProfile, getDepartments, updateDepartments } from '../controllers/settings.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.put('/profile', updateProfile);
router.get('/departments', getDepartments);
router.post('/departments', updateDepartments);

export default router;