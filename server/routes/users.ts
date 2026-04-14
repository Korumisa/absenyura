import { Router } from 'express';
import multer from 'multer';
import { getUsers, createUser, updateUser, deleteUser, importUsers, resetDeviceFingerprint } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();
const uploadExcel = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/', authorize(['SUPER_ADMIN']), getUsers);
router.post('/', authorize(['SUPER_ADMIN']), createUser);
router.post('/import', authorize(['SUPER_ADMIN']), uploadExcel.single('file'), importUsers);
router.put('/:id', authorize(['SUPER_ADMIN']), updateUser);
router.delete('/:id', authorize(['SUPER_ADMIN']), deleteUser);
router.post('/:id/reset-device', authorize(['SUPER_ADMIN', 'ADMIN']), resetDeviceFingerprint);

export default router;