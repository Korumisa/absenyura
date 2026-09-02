import { Router } from 'express';
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  getSessionQR,
  getSessionById,
  getSessionAttendances,
} from '../controllers/session.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { CreateSessionBody, UpdateSessionBody, SessionParams } from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);

router.get('/', getSessions);
router.get('/:id', validateParams(SessionParams), getSessionById);
router.get(
  '/:id/qr',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(SessionParams),
  getSessionQR
);
router.get(
  '/:id/attendances',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(SessionParams),
  getSessionAttendances
);
router.post(
  '/',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateBody(CreateSessionBody),
  createSession
);
router.put(
  '/:id',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(SessionParams),
  validateBody(UpdateSessionBody),
  updateSession
);
router.delete(
  '/:id',
  authorize(['SUPER_ADMIN', 'ADMIN']),
  validateParams(SessionParams),
  deleteSession
);

export default router;
