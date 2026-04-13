import { Router } from 'express';
import { getExcuses, createExcuse, reviewExcuse } from '../controllers/excuse.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import multer from 'multer';
import path from 'path';

import fs from 'fs';

// Multer setup for proof upload
const storage = process.env.VERCEL ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = Router();

router.use(authenticate);

router.get('/', getExcuses);
router.post('/', upload.single('proof'), createExcuse);
router.put('/:id/review', authorize(['SUPER_ADMIN', 'ADMIN']), reviewExcuse);

export default router;