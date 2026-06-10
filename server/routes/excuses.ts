import { Router } from 'express';
import {
  getExcuses,
  createExcuse,
  reviewExcuse,
  getExcuseChallenge,
} from '../controllers/excuse.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadImageOnly, processAndValidateImage } from '../utils/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', getExcuses);
router.get('/challenge', authorize(['USER']), getExcuseChallenge);
router.post(
  '/',
  authorize(['USER']),
  uploadImageOnly.single('proof'),
  processAndValidateImage,
  createExcuse
);
router.put('/:id/review', authorize(['SUPER_ADMIN', 'ADMIN']), reviewExcuse);

export default router;
