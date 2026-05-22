import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import { fileTypeFromFile, fileTypeFromBuffer } from 'file-type';
import { Request, Response, NextFunction } from 'express';

const tempDir = os.tmpdir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${file.fieldname}-${crypto.randomBytes(16).toString('hex')}${ext}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('application/pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar atau PDF yang diizinkan!'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const imageOnlyFilter = (_req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!'), false);
  }
};

export const uploadImageOnly = multer({
  storage: storage,
  fileFilter: imageOnlyFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

const excelFilter = (_req: any, file: any, cb: any) => {
  const ok = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]);
  if (ok.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file Excel (.xlsx/.xls) yang diizinkan!'), false);
  }
};

export const uploadExcel = multer({
  storage: storage,
  fileFilter: excelFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const processAndValidateImage = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;
  const tempCleanedPath = `${filePath}-clean`;

  try {
    // 1. Verify Extension
    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      await fs.promises.unlink(filePath).catch(() => {});
      req.file = undefined;
      return res.status(400).json({
        success: false,
        error: 'Format file tidak diizinkan. Hanya file JPG, JPEG, PNG, dan WEBP yang diperbolehkan.'
      });
    }

    // Read the first 4100 bytes ONCE to avoid Windows file lock (EBUSY) issues
    const fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(4100);
    const { bytesRead } = await fileHandle.read(buffer, 0, 4100, 0);
    await fileHandle.close();

    // 2. Sniff MIME type from buffer
    const meta = await fileTypeFromBuffer(buffer.subarray(0, bytesRead));
    if (!meta || !meta.mime.startsWith('image/')) {
      await fs.promises.unlink(filePath).catch(() => {});
      req.file = undefined;
      return res.status(400).json({
        success: false,
        error: 'Konten file terdeteksi tidak valid sebagai gambar.'
      });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(meta.mime)) {
      await fs.promises.unlink(filePath).catch(() => {});
      req.file = undefined;
      return res.status(400).json({
        success: false,
        error: 'Hanya format gambar JPG, PNG, dan WEBP yang diperbolehkan.'
      });
    }

    // 3. Gallery Upload Check (Look for "Exif" in the first 1024 bytes)
    const headerString = buffer.subarray(0, Math.min(bytesRead, 1024)).toString('ascii');
    if (headerString.includes('Exif')) {
      await fs.promises.unlink(filePath).catch(() => {});
      req.file = undefined;
      return res.status(400).json({
        success: false,
        error: 'Kami mendeteksi foto ini diunggah dari galeri. Silakan gunakan kamera langsung di dalam aplikasi untuk absensi Anda.'
      });
    }

    // 4. Strip EXIF metadata using sharp
    try {
      await sharp(filePath).toFile(tempCleanedPath);
      await fs.promises.unlink(filePath).catch(() => {});
      await fs.promises.rename(tempCleanedPath, filePath);
    } catch (sharpError) {
      console.warn('Sharp image processing failed, falling back to original file:', sharpError);
      // Clean up tempCleanedPath if it was created
      await fs.promises.unlink(tempCleanedPath).catch(() => {});
    }

    next();
  } catch (error: any) {
    console.error('Image processing error:', error);
    await fs.promises.unlink(filePath).catch(() => {});
    await fs.promises.unlink(tempCleanedPath).catch(() => {});
    req.file = undefined;
    return res.status(400).json({
      success: false,
      error: 'Foto yang diunggah rusak atau tidak dapat diproses. (' + (error?.message || 'Unknown Error') + ')'
    });
  }
};

