import L from 'leaflet';

const LEAFLET_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images';

/** Perbaiki ikon marker Leaflet yang rusak di bundler Vite (path /images/ tidak ada) */
export function fixLeafletDefaultIcons() {
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: `${LEAFLET_CDN}/marker-icon-2x.png`,
    iconUrl: `${LEAFLET_CDN}/marker-icon.png`,
    shadowUrl: `${LEAFLET_CDN}/marker-shadow.png`,
  });
}
