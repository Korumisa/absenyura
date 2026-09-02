import { Router } from 'express';
import { login, logout, refresh, seedAdmin, flushDb } from '../controllers/auth.controller.js';
import { guardInternal } from '../middlewares/guardInternal.js';
import { validateBody } from '../middlewares/validate.js';
import { LoginBody, RefreshBody } from '../zod-schemas/index.js';

const router = Router();

router.post('/login', validateBody(LoginBody), login);
router.post('/logout', logout);
router.post('/refresh', validateBody(RefreshBody), refresh);
router.post('/seed', guardInternal, seedAdmin);
router.post('/flush-db', guardInternal, flushDb);

export default router;
