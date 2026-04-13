import { Router } from 'express';
import { login, logout, refresh, seedAdmin } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/seed', seedAdmin); // Just for initial setup

export default router;