import { describe, expect, test, vi } from 'vitest';
import {
  hasCameraOriginExif,
  processAndValidateImage,
  validateUploadedFileContent,
} from './upload';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

// 1x1 pixel JPEG base64 (known to throw on sharp because of premature EOF/corrupt headers)
const sampleJpegBase64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('validateUploadedFileContent', () => {
  test('rejects JPG extension when content is not a real image', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `spoof-${Date.now()}.jpg`);
    fs.writeFileSync(testFilePath, '%PDF-1.4 not-a-real-image');

    try {
      const result = await validateUploadedFileContent(
        {
          path: testFilePath,
          originalname: 'proof.jpg',
          mimetype: 'image/jpeg',
        } as Express.Multer.File,
        { imageOnly: true }
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/gambar/i);
    } finally {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
  });
});

describe('hasCameraOriginExif', () => {
  const exifOf = async (exif: Record<string, Record<string, string>>) =>
    (
      await sharp({
        create: { width: 8, height: 8, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .jpeg()
        .withExif(exif)
        .toBuffer()
        .then((buf) => sharp(buf).metadata())
    ).exif;

  test('detects DateTimeOriginal inside the Exif sub-IFD', async () => {
    expect(
      hasCameraOriginExif(await exifOf({ IFD2: { DateTimeOriginal: '2026:10:09 08:00:00' } }))
    ).toBe(true);
  });

  test('ignores missing or encoder-only EXIF', async () => {
    expect(hasCameraOriginExif(undefined)).toBe(false);
    expect(hasCameraOriginExif(await exifOf({ IFD0: { Software: 'WebKit' } }))).toBe(false);
  });
});

describe('processAndValidateImage middleware', () => {
  test('processes a valid PNG image successfully', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-image-${Date.now()}.png`);

    // Generate a valid PNG image using sharp
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toFile(testFilePath);

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-image.png',
        mimetype: 'image/png',
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const next = vi.fn();

    try {
      await processAndValidateImage(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      const cleanedPath = `${testFilePath}-clean`;
      if (fs.existsSync(cleanedPath)) {
        fs.unlinkSync(cleanedPath);
      }
    }
  });

  test('processes a valid JPEG image successfully', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-image-${Date.now()}.jpg`);

    // Generate a valid JPEG image using sharp
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .toFile(testFilePath);

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const next = vi.fn();

    try {
      await processAndValidateImage(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      const cleanedPath = `${testFilePath}-clean`;
      if (fs.existsSync(cleanedPath)) {
        fs.unlinkSync(cleanedPath);
      }
    }
  });

  test('accepts JPEG with minimal encoder EXIF (Safari/WebKit canvas.toBlob)', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-webkit-exif-${Date.now()}.jpg`);

    await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .jpeg()
      .withExif({ IFD0: { XResolution: '72/1', YResolution: '72/1', ResolutionUnit: '2' } })
      .toFile(testFilePath);
    expect((await sharp(testFilePath).metadata()).exif).toBeDefined();

    const req = {
      file: { path: testFilePath, originalname: 'photo.jpg', mimetype: 'image/jpeg' },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
    const next = vi.fn();

    try {
      await processAndValidateImage(req, res, next);
      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    } finally {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
  });

  test('rejects JPEG carrying camera EXIF (gallery upload heuristic)', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-exif-${Date.now()}.jpg`);

    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .jpeg()
      .withExif({ IFD0: { Make: 'Apple', Model: 'iPhone 15' } })
      .toFile(testFilePath);

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-exif.jpg',
        mimetype: 'image/jpeg',
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const next = vi.fn();

    try {
      await processAndValidateImage(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('diunggah dari galeri'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      const cleanedPath = `${testFilePath}-clean`;
      if (fs.existsSync(cleanedPath)) {
        fs.unlinkSync(cleanedPath);
      }
    }
  });

  test('rejects corrupt JPEG when sharp cannot process', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-corrupt-${Date.now()}.jpg`);

    // Write sample JPEG (corrupt/incomplete)
    fs.writeFileSync(testFilePath, Buffer.from(sampleJpegBase64, 'base64'));

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-corrupt.jpg',
        mimetype: 'image/jpeg',
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const next = vi.fn();

    try {
      await processAndValidateImage(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      const cleanedPath = `${testFilePath}-clean`;
      if (fs.existsSync(cleanedPath)) {
        fs.unlinkSync(cleanedPath);
      }
    }
  });

  test('returns 400 for an empty file', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-empty-${Date.now()}.jpg`);

    // Create an empty file (0 bytes)
    fs.writeFileSync(testFilePath, '');

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-empty.jpg',
        mimetype: 'image/jpeg',
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const next = vi.fn();

    try {
      await processAndValidateImage(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Konten file terdeteksi tidak valid sebagai gambar.',
        })
      );
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
