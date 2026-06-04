import { Router } from 'express';
import { getExcuses, createExcuse, reviewExcuse } from '../controllers/excuse.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { upload, validateUploadedProof } from '../utils/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', getExcuses);
router.post('/', upload.single('proof'), validateUploadedProof, createExcuse);
router.put('/:id/review', authorize(['SUPER_ADMIN', 'ADMIN']), reviewExcuse);

export default router;
