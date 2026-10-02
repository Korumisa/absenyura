import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ATTENDANCE_PHOTO_MAX_BYTES,
  encodeAttendancePhoto,
  prepareAttendancePhoto,
} from './imageUpload';

function mockCanvas(outputs: Array<Blob | null>) {
  const context = { drawImage: vi.fn() };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback) => callback(outputs.shift() ?? null)),
  };
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
  return { canvas, context };
}

const source = { width: 4000, height: 6000 } as HTMLCanvasElement;
const jpeg = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('attendance photo compression', () => {
  it('keeps an already-small JPEG unchanged', async () => {
    const photo = jpeg(100_000);
    await expect(prepareAttendancePhoto(photo)).resolves.toBe(photo);
  });

  it('rejects empty or non-image input before uploading', async () => {
    await expect(prepareAttendancePhoto(new Blob())).rejects.toThrow('Foto');
    await expect(prepareAttendancePhoto(new Blob(['text']))).rejects.toThrow('Foto');
  });

  it('limits both portrait dimensions and releases the working canvas', async () => {
    const photo = jpeg(200_000);
    const { canvas, context } = mockCanvas([photo]);
    await expect(encodeAttendancePhoto(source)).resolves.toBe(photo);
    expect(context.drawImage).toHaveBeenCalledWith(source, 0, 0, 853, 1280);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.82);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('reduces JPEG quality until a photo exceeding 3 MiB fits the target', async () => {
    const photo = jpeg(800_000);
    const { canvas } = mockCanvas([jpeg(4 * 1024 * 1024), photo]);
    await expect(encodeAttendancePhoto(source)).resolves.toBe(photo);
    expect(canvas.toBlob).toHaveBeenCalledTimes(2);
    expect(canvas.toBlob).toHaveBeenLastCalledWith(expect.any(Function), 'image/jpeg', 0.7);
  });

  it('reduces dimensions when lowering quality alone is insufficient', async () => {
    const big = jpeg(ATTENDANCE_PHOTO_MAX_BYTES + 1);
    const photo = jpeg(900_000);
    const { context } = mockCanvas([big, big, big, big, photo]);
    await expect(encodeAttendancePhoto(source)).resolves.toBe(photo);
    expect(context.drawImage).toHaveBeenLastCalledWith(source, 0, 0, 639, 960);
  });

  it('never falls back to an oversized upload', async () => {
    const { canvas } = mockCanvas(Array(24).fill(jpeg(ATTENDANCE_PHOTO_MAX_BYTES + 1)));
    await expect(encodeAttendancePhoto(source)).rejects.toThrow('terlalu besar');
    expect(canvas.toBlob).toHaveBeenCalledTimes(24);
    expect(canvas.width).toBe(0);
  });

  it('handles failed canvas encoding without returning an empty photo', async () => {
    const { canvas } = mockCanvas([null]);
    await expect(encodeAttendancePhoto(source)).rejects.toThrow('Foto');
    expect(canvas.width).toBe(0);
  });

  it('rejects a camera frame before video dimensions are ready', async () => {
    await expect(
      encodeAttendancePhoto({ width: 0, height: 0 } as HTMLCanvasElement)
    ).rejects.toThrow('Kamera belum siap');
  });

  it('compresses a large existing photo and releases its object URL', async () => {
    const photo = jpeg(500_000);
    mockCanvas([photo]);
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        naturalWidth = 6000;
        naturalHeight = 4000;
        decode = vi.fn().mockResolvedValue(undefined);
      }
    );
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-photo');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const original = jpeg(4 * 1024 * 1024);
    await expect(prepareAttendancePhoto(original)).resolves.toBe(photo);
    expect(createUrl).toHaveBeenCalledWith(original);
    expect(revokeUrl).toHaveBeenCalledWith('blob:test-photo');
  });

  it('reports decode failures and still releases its object URL', async () => {
    mockCanvas([]);
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        decode = vi.fn().mockRejectedValue(new Error('Invalid image'));
      }
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:broken-photo');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await expect(prepareAttendancePhoto(jpeg(4 * 1024 * 1024))).rejects.toThrow('dikompres');
    expect(revokeUrl).toHaveBeenCalledWith('blob:broken-photo');
  });
});
