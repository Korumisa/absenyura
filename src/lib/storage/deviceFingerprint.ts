/**
 * Fingerprint device yang stabil & deterministik.
 *
 * Tujuan: meski user clear localStorage (incognito, tombol "Lupakan perangkat",
 * extension privacy), hash yang sama akan ter-regenerate dari atribut browser
 * sehingga login dari device yang sama selalu menghasilkan fingerprint identik.
 */

const STORAGE_KEY = 'device_fingerprint';

function getRawSignature(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const lang = typeof navigator !== 'undefined' ? navigator.language : '';
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    tz = '';
  }
  const screenInfo =
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '';
  const hwc =
    typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 0;
  const platform =
    typeof navigator !== 'undefined' && (navigator as { platform?: string }).platform
      ? (navigator as { platform?: string }).platform
      : '';
  return `${ua}|${lang}|${tz}|${screenInfo}|${hwc}|${platform}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getDeviceFingerprint(): Promise<string> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && cached.length >= 16) return cached;
  } catch {
    // localStorage tidak tersedia (mis. blocked) — lanjut regenerate
  }

  const raw = getRawSignature();
  const hex = (await sha256Hex(raw)).slice(0, 24);

  try {
    localStorage.setItem(STORAGE_KEY, hex);
  } catch {
    // abaikan; hash akan tetap konsisten karena input deterministik
  }

  return hex;
}

export function forgetDeviceFingerprint(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
}
