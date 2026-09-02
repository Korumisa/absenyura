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
import { validateBody, validateParams } from '../middlewares/validate.js';
import {
  CreateUserBody,
  UpdateUserBody,
  ImportUsersBody,
  UserParams,
} from '../zod-schemas/index.js';
import { uploadExcel } from '../utils/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['SUPER_ADMIN']), getUsers);
router.get('/:id', authorize(['SUPER_ADMIN', 'ADMIN']), validateParams(UserParams), getUserById);
router.get(
  '/:id/enrollments',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(UserParams),
  getUserEnrollments
);
router.post('/', authorize(['SUPER_ADMIN']), validateBody(CreateUserBody), createUser);
router.post(
  '/import',
  authorize(['SUPER_ADMIN']),
  uploadExcel.single('file'),
  validateBody(ImportUsersBody),
  importUsers
);
router.put(
  '/:id',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(UserParams),
  validateBody(UpdateUserBody),
  updateUser
);
router.delete('/:id', authorize(['SUPER_ADMIN']), validateParams(UserParams), deleteUser);
router.post(
  '/:id/reset-device',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(UserParams),
  resetDeviceFingerprint
);

export default router;
