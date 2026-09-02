import { Router } from 'express';
import {
  getClasses,
  getClassById,
  getEnrollmentOptions,
  createClass,
  updateClass,
  deleteClass,
  getStudents,
  enrollStudents,
  removeStudent,
} from '../controllers/class.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import {
  CreateClassBody,
  UpdateClassBody,
  EnrollStudentsBody,
  ClassParams,
  EnrollParams,
} from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);

router.get('/', getClasses);
router.get('/enrollment-options', authorize(['SUPER_ADMIN', 'ADMIN']), getEnrollmentOptions);
router.get('/:id', validateParams(ClassParams), getClassById);
router.post('/', authorize(['SUPER_ADMIN', 'ADMIN']), validateBody(CreateClassBody), createClass);
router.put(
  '/:id',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(ClassParams),
  validateBody(UpdateClassBody),
  updateClass
);
router.delete('/:id', authorize(['SUPER_ADMIN']), validateParams(ClassParams), deleteClass);

router.get('/:id/students', validateParams(ClassParams), getStudents);
router.post(
  '/:id/enroll',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(ClassParams),
  validateBody(EnrollStudentsBody),
  enrollStudents
);
router.delete(
  '/:id/enroll/:student_id',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(EnrollParams),
  removeStudent
);

export default router;
