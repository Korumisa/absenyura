import { describe, expect, test, vi } from 'vitest';
import { processAndValidateImage } from './upload';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

// 1x1 pixel JPEG base64 (known to throw on sharp because of premature EOF/corrupt headers)
const sampleJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

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
        background: { r: 255, g: 0, b: 0 }
      }
    }).png().toFile(testFilePath);

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-image.png',
        mimetype: 'image/png'
      }
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
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
        background: { r: 0, g: 255, b: 0 }
      }
    }).jpeg().toFile(testFilePath);

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg'
      }
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
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

  test('falls back to original file if sharp fails (corrupt JPEG)', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-corrupt-${Date.now()}.jpg`);
    
    // Write sample JPEG (corrupt/incomplete)
    fs.writeFileSync(testFilePath, Buffer.from(sampleJpegBase64, 'base64'));

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-corrupt.jpg',
        mimetype: 'image/jpeg'
      }
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
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

  test('returns 400 for an empty file', async () => {
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test-empty-${Date.now()}.jpg`);
    
    // Create an empty file (0 bytes)
    fs.writeFileSync(testFilePath, '');

    const req = {
      file: {
        path: testFilePath,
        originalname: 'test-empty.jpg',
        mimetype: 'image/jpeg'
      }
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as any;

    const next = vi.fn();

    try {
      await processAndValidateImage(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Konten file terdeteksi tidak valid sebagai gambar.'
      }));
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
