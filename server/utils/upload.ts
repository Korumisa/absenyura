import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

const tempDir = os.tmpdir();

 
const storage = multer.diskStorage({
  destination: (req: any, file: Express.Multer.File, cb: any) => {
    cb(null, tempDir);
  },
  filename: (req: any, file: Express.Multer.File, cb: any) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${file.fieldname}-${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
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
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const imageOnlyFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
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

const excelFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
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

export async function validateUploadedFileContent(
  file: Express.Multer.File,
  opts: { allowPdf?: boolean; imageOnly?: boolean } = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  const filePath = file.path;
  const ext = path.extname(file.originalname).toLowerCase();
  const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const allowedImageMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const allowPdf = Boolean(opts.allowPdf && !opts.imageOnly);

  if (!imageExtensions.has(ext) && !(allowPdf && ext === '.pdf')) {
    return {
      ok: false,
      error: allowPdf
        ? 'Format file tidak diizinkan. Gunakan JPG, JPEG, PNG, WEBP, atau PDF.'
        : 'Format file tidak diizinkan. Gunakan JPG, JPEG, PNG, atau WEBP.',
    };
  }

  // Use fileTypeFromBuffer to avoid file-type's dependency issues
  const fileHandle = await fs.promises.open(filePath, 'r');
  const buffer = Buffer.alloc(4100);
  const { bytesRead } = await fileHandle.read(buffer, 0, 4100, 0);
  await fileHandle.close();

  const meta = await fileTypeFromBuffer(buffer.subarray(0, bytesRead));
  if (!meta) {
    return { ok: false, error: 'Konten file tidak dapat divalidasi.' };
  }

  if (allowedImageMimes.has(meta.mime)) return { ok: true };
  if (allowPdf && meta.mime === 'application/pdf') return { ok: true };

  return {
    ok: false,
    error: allowPdf
      ? 'Konten file harus berupa gambar valid atau PDF.'
      : 'Konten file harus berupa gambar JPG, PNG, atau WEBP yang valid.',
  };
}

export const validateUploadedProof = async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;
  if (!file) return next();
  try {
    const result = await validateUploadedFileContent(file, { allowPdf: true });
    if (!result.ok) {
      await fs.promises.unlink(file.path).catch(() => {});
      req.file = undefined;
      return res.status(400).json({ success: false, error: result.error });
    }
    next();
  } catch (error: any) {
    await fs.promises.unlink(file.path).catch(() => {});
    req.file = undefined;
    return res.status(400).json({
      success: false,
      error:
        'File yang diunggah rusak atau tidak dapat divalidasi. (' +
        (error?.message || 'Unknown Error') +
        ')',
    });
  }
};

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
        error:
          'Format file tidak diizinkan. Hanya file JPG, JPEG, PNG, dan WEBP yang diperbolehkan.',
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
        error: 'Konten file terdeteksi tidak valid sebagai gambar.',
      });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(meta.mime)) {
      await fs.promises.unlink(filePath).catch(() => {});
      req.file = undefined;
      return res.status(400).json({
        success: false,
        error: 'Hanya format gambar JPG, PNG, dan WEBP yang diperbolehkan.',
      });
    }

    const headerBytes = buffer.subarray(0, Math.min(bytesRead, 2048));
    const hasExifMarker =
      (meta.mime === 'image/jpeg' &&
        headerBytes.includes(Buffer.from('Exif\u0000\u0000', 'ascii'))) ||
      (meta.mime === 'image/png' && headerBytes.includes(Buffer.from('eXIf', 'ascii'))) ||
      (meta.mime === 'image/webp' && headerBytes.includes(Buffer.from('EXIF', 'ascii')));
    if (hasExifMarker) {
      await fs.promises.unlink(filePath).catch(() => {});
      req.file = undefined;
      return res.status(400).json({
        success: false,
        error:
          'Kami mendeteksi foto ini diunggah dari galeri. Silakan gunakan kamera langsung di dalam aplikasi untuk absensi Anda.',
      });
    }

    // 4. Strip EXIF metadata using sharp
    try {
      await sharp(filePath).toFile(tempCleanedPath);
      await fs.promises.unlink(filePath).catch(() => {});
      await fs.promises.rename(tempCleanedPath, filePath);
    } catch (sharpError) {
      console.warn('Sharp image processing failed:', sharpError);
      await fs.promises.unlink(filePath).catch(() => {});
      await fs.promises.unlink(tempCleanedPath).catch(() => {});
      req.file = undefined;
      return res.status(400).json({
        success: false,
        error: 'Foto tidak dapat diproses. Silakan ambil foto ulang dengan pencahayaan yang cukup.',
      });
    }

    next();
  } catch (error: any) {
    console.error('Image processing error:', error);
    await fs.promises.unlink(filePath).catch(() => {});
    await fs.promises.unlink(tempCleanedPath).catch(() => {});
    req.file = undefined;
    return res.status(400).json({
      success: false,
      error:
        'Foto yang diunggah rusak atau tidak dapat diproses. (' +
        (error?.message || 'Unknown Error') +
        ')',
    });
  }
};
