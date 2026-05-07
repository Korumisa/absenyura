export async function prepareImageForUpload(
  file: File,
  opts?: {
    maxBytes?: number;
    maxWidth?: number;
    quality?: number;
  }
) {
  const maxBytes = opts?.maxBytes ?? 4 * 1024 * 1024;
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

