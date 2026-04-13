import { Router } from 'express';
import { getClasses, createClass, updateClass, deleteClass, getStudents, enrollStudents, removeStudent } from '../controllers/class.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getClasses);
router.post('/', authorize(['SUPER_ADMIN', 'ADMIN']), createClass);
router.put('/:id', authorize(['SUPER_ADMIN', 'ADMIN']), updateClass);
router.delete('/:id', authorize(['SUPER_ADMIN']), deleteClass);

router.get('/:id/students', getStudents);
router.post('/:id/enroll', authorize(['SUPER_ADMIN', 'ADMIN']), enrollStudents);
router.delete('/:id/enroll/:student_id', authorize(['SUPER_ADMIN', 'ADMIN']), removeStudent);

export default router;