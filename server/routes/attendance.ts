import { Router } from 'express';
import { checkIn, checkOut, getChallenge } from '../controllers/attendance.controller.js';
import { overrideAttendance } from '../controllers/attendanceOverride.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { idempotency } from '../middlewares/idempotency.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import {
  CheckinBody,
  CheckoutBody,
  OverrideAttendanceBody,
  AttendanceCheckoutParams,
} from '../zod-schemas/index.js';
import { uploadImageOnly, processAndValidateImage } from '../utils/upload.js';

const router = Router();

router.use(authenticate);

// Request a cryptographic challenge nonce before capturing photo
router.get('/challenge', getChallenge);

router.post(
  '/check-in',
  authorize(['USER']),
  idempotency,
  uploadImageOnly.single('photo'),
  processAndValidateImage,
  validateBody(CheckinBody),
  checkIn
);
router.put(
  '/:id/check-out',
  authorize(['USER']),
  idempotency,
  uploadImageOnly.single('photo'),
  processAndValidateImage,
  validateParams(AttendanceCheckoutParams),
  validateBody(CheckoutBody),
  checkOut
);
router.post(
  '/override',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  idempotency,
  validateBody(OverrideAttendanceBody),
  overrideAttendance
);

export default router;
