import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getDepartments,
  updateDepartments,
  getSubjects,
  updateSubjects,
} from '../controllers/settings.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.js';
import {
  UpdateProfileBody,
  UpdateDepartmentsBody,
  UpdateSubjectsBody,
} from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', validateBody(UpdateProfileBody), updateProfile);
router.get('/departments', getDepartments);
router.post('/departments', validateBody(UpdateDepartmentsBody), updateDepartments);
router.get('/subjects', getSubjects);
router.post('/subjects', validateBody(UpdateSubjectsBody), updateSubjects);

export default router;
