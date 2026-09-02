import { Router } from 'express';
import {
  getExcuses,
  createExcuse,
  reviewExcuse,
  getExcuseChallenge,
} from '../controllers/excuse.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { idempotency } from '../middlewares/idempotency.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { CreateExcuseBody, ReviewExcuseBody, ExcuseParams } from '../zod-schemas/index.js';
import { uploadImageOnly, processAndValidateImage } from '../utils/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', getExcuses);
router.get('/challenge', authorize(['USER']), getExcuseChallenge);
router.post(
  '/',
  authorize(['USER']),
  idempotency,
  uploadImageOnly.single('proof'),
  processAndValidateImage,
  validateBody(CreateExcuseBody),
  createExcuse
);
router.put(
  '/:id/review',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(ExcuseParams),
  validateBody(ReviewExcuseBody),
  reviewExcuse
);

export default router;
