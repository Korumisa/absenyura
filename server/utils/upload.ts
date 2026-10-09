import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

const tempDir = os.tmpdir();

// Ensure runtime upload directories exist (VPS non-Cloudinary path)
// Multer uses tempDir; but static mounts in app.ts read from ../uploads/*
const UPLOAD_SUBDIRS = [
  'uploads',
  'uploads/public-site',
  'uploads/attendance',
  'uploads/excuses',
] as const;
for (const dir of UPLOAD_SUBDIRS) {
  const full = path.resolve(process.cwd(), dir);
  fs.promises.mkdir(full, { recursive: true }).catch(() => void 0);
}

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

// Make, Model, GPS IFD pointer, DateTimeOriginal, MakerNote
const CAMERA_ORIGIN_EXIF_TAGS = new Set([0x010f, 0x0110, 0x8825, 0x9003, 0x927c]);
const EXIF_SUB_IFD_TAG = 0x8769;

export function hasCameraOriginExif(exif: Buffer | undefined): boolean {
  if (!exif) return false;
  const tiff = exif.subarray(0, 6).toString('latin1') === 'Exif\0\0' ? exif.subarray(6) : exif;
  if (tiff.length < 8) return false;
  const order = tiff.toString('latin1', 0, 2);
  if (order !== 'II' && order !== 'MM') return false;
  const le = order === 'II';
  const u16 = (o: number) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o: number) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));

  const visited = new Set<number>();
  const scanIfd = (offset: number): boolean => {
    if (visited.has(offset) || offset + 2 > tiff.length) return false;
    visited.add(offset);
    const count = u16(offset);
    for (let i = 0; i < count; i++) {
      const entry = offset + 2 + i * 12;
      if (entry + 12 > tiff.length) return false;
      const tag = u16(entry);
      if (CAMERA_ORIGIN_EXIF_TAGS.has(tag)) return true;
      if (tag === EXIF_SUB_IFD_TAG && scanIfd(u32(entry + 8))) return true;
    }
    return false;
  };
  return scanIfd(u32(4));
}

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

    // Safari/WebKit (every iOS browser) writes a minimal EXIF block on canvas.toBlob, so the
    // mere presence of EXIF cannot prove a gallery upload; only camera-origin tags do.
    const exif = await sharp(filePath)
      .metadata()
      .then((m) => m.exif)
      .catch(() => undefined);
    if (hasCameraOriginExif(exif)) {
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
