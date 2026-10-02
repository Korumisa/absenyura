// Leave headroom below the server's 3 MiB photo limit.
export const ATTENDANCE_PHOTO_MAX_BYTES = 1024 * 1024;

export async function encodeAttendancePhoto(source: HTMLCanvasElement): Promise<Blob> {
  if (!source.width || !source.height) {
    throw new Error('Kamera belum siap. Tunggu pratinjau kamera lalu ambil foto lagi.');
  }

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1280 / Math.max(source.width, source.height));
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Foto belum dapat diproses. Silakan ambil foto ulang.');

  try {
    for (let resize = 0; resize < 6; resize += 1) {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.7, 0.58, 0.46]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', quality)
        );
        if (!blob || blob.size === 0) {
          throw new Error('Foto belum dapat diproses. Silakan ambil foto ulang.');
        }
        if (blob.type === 'image/jpeg' && blob.size <= ATTENDANCE_PHOTO_MAX_BYTES) {
          return blob;
        }
      }
      canvas.width = Math.max(1, Math.floor(canvas.width * 0.75));
      canvas.height = Math.max(1, Math.floor(canvas.height * 0.75));
    }
    throw new Error('Foto masih terlalu besar setelah kompresi. Silakan ambil foto ulang.');
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function prepareAttendancePhoto(photo: Blob): Promise<Blob> {
  if (photo.size > 0 && photo.size <= ATTENDANCE_PHOTO_MAX_BYTES && photo.type === 'image/jpeg') {
    return photo;
  }
  if (!photo.size || !photo.type.startsWith('image/')) {
    throw new Error('Foto belum tersedia. Silakan ambil foto ulang.');
  }

  const url = URL.createObjectURL(photo);
  const canvas = document.createElement('canvas');
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await encodeAttendancePhoto(canvas);
  } catch {
    throw new Error('Foto belum dapat dikompres. Silakan ambil foto ulang.');
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function prepareImageForUpload(
  file: File,
  opts?: {
    maxBytes?: number;
    maxWidth?: number;
    quality?: number;
  }
) {
  const maxBytes = opts?.maxBytes ?? 4800 * 1024;
  const maxWidth = opts?.maxWidth ?? 1920;
  const baseQuality = opts?.quality ?? 0.82;

  if (!file.type.startsWith('image/')) return file;
  if (file.size <= maxBytes) return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Gambar tidak valid'));
    el.src = dataUrl;
  });

  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const toBlob = (q: number) =>
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', q);
    });

  let quality = baseQuality;
  let blob = await toBlob(quality);
  while (blob && blob.size > maxBytes && quality > 0.6) {
    quality = Math.max(0.6, quality - 0.08);
    blob = await toBlob(quality);
  }

  if (!blob) return file;
  if (blob.size > maxBytes) return file;

  const name = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}
