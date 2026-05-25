import { Router } from 'express';
import {
  getUsers,
  getUserById,
  getUserEnrollments,
  createUser,
  updateUser,
  deleteUser,
  importUsers,
  resetDeviceFingerprint,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadExcel } from '../utils/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['SUPER_ADMIN']), getUsers);
router.get('/:id', authorize(['SUPER_ADMIN', 'ADMIN']), getUserById);
router.get('/:id/enrollments', authorize(['SUPER_ADMIN', 'ADMIN']), getUserEnrollments);
router.post('/', authorize(['SUPER_ADMIN']), createUser);
router.post('/import', authorize(['SUPER_ADMIN']), uploadExcel.single('file'), importUsers);
router.put('/:id', authorize(['SUPER_ADMIN', 'ADMIN']), updateUser);
router.delete('/:id', authorize(['SUPER_ADMIN']), deleteUser);
router.post('/:id/reset-device', authorize(['SUPER_ADMIN', 'ADMIN']), resetDeviceFingerprint);

export default router;
