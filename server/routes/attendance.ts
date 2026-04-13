import { Router } from 'express';
import { checkIn, checkOut } from '../controllers/attendance.controller.js';
import { overrideAttendance } from '../controllers/attendanceOverride.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { upload } from '../utils/upload.js';

const router = Router();

router.use(authenticate);

router.post('/check-in', authorize(['USER']), upload.single('photo'), checkIn);
router.put('/:id/check-out', authorize(['USER']), checkOut);
router.post('/override', authorize(['SUPER_ADMIN', 'ADMIN']), overrideAttendance);

export default router;