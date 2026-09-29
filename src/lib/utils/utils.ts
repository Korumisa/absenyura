import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  const raw = String(text).replace(/\s+/g, ' ').trim();
  if (raw.length <= maxLength) return raw;
  const sliced = raw.slice(0, maxLength).trimEnd();
  if (sliced.length === maxLength && /\S/.test(sliced[sliced.length - 1] ?? '')) {
    const lastSpace = sliced.lastIndexOf(' ');
    if (lastSpace > Math.floor(maxLength * 0.6)) {
      return `${sliced.slice(0, lastSpace).trimEnd()}…`;
    }
  }
  return `${sliced}…`;
}
