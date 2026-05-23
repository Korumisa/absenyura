import { Router } from 'express';
import { login, logout, refresh, seedAdmin, flushDb } from '../controllers/auth.controller.js';
import { guardInternal } from '../middlewares/guardInternal.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/seed', guardInternal, seedAdmin);
router.post('/flush-db', guardInternal, flushDb);

export default router;