/**
 * Menghasilkan logo WebP/PNG ringkas dari aset PNG besar di public/.
 * Jalankan: node scripts/optimize-public-logos.mjs
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const source = path.join(publicDir, '3. HM SDP.png');
const outWebp = path.join(publicDir, 'logo-hmsdp.webp');
const outPng = path.join(publicDir, 'logo-hmsdp.png');

const img = sharp(source);
await img
  .clone()
  .resize({ width: 192, withoutEnlargement: true })
  .webp({ quality: 85 })
  .toFile(outWebp);

await img
  .clone()
  .resize({ width: 192, withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(outPng);

console.log('Wrote', path.basename(outWebp), path.basename(outPng));
