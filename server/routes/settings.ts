import { Router } from 'express';
import { getProfile, updateProfile, getDepartments, updateDepartments, getSubjects, updateSubjects } from '../controllers/settings.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/departments', getDepartments);
router.post('/departments', updateDepartments);
router.get('/subjects', getSubjects);
router.post('/subjects', updateSubjects);

export default router;