import { Router } from 'express';
import { getSessions, createSession, updateSession, deleteSession, getSessionQR, getSessionById, getSessionAttendances } from '../controllers/session.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getSessions);
router.get('/:id', getSessionById);
router.get('/:id/qr', authorize(['SUPER_ADMIN', 'ADMIN']), getSessionQR);
router.get('/:id/attendances', authorize(['SUPER_ADMIN', 'ADMIN']), getSessionAttendances);
router.post('/', authorize(['SUPER_ADMIN', 'ADMIN']), createSession);
router.put('/:id', authorize(['SUPER_ADMIN', 'ADMIN']), updateSession);
router.delete('/:id', authorize(['SUPER_ADMIN', 'ADMIN']), deleteSession);

export default router;