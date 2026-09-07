type StrippablePrefix = readonly string[];

const LEAFLET_PREFIXES: StrippablePrefix = [
  '_leaflet_id',
  '_leaflet_events',
  '_leaflet_tile_loaded',
  '_leaflet',
] as const;
const HTML5QR_PREFIXES: StrippablePrefix = ['__html5', '__qr', 'html5Qr'] as const;

const DEFAULT_PREFIXES: StrippablePrefix = [
  ...LEAFLET_PREFIXES,
  ...HTML5QR_PREFIXES,
  '_react',
  '__react',
] as const;

export function stripDomExpandos(rootId: string, prefixes: StrippablePrefix = DEFAULT_PREFIXES): void {
  const root = document.getElementById(rootId);
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;
  while (node) {
    const el = node as HTMLElement;
    for (const key of Object.keys(el)) {
      if (prefixes.some((p) => key.startsWith(p)) || key.startsWith('_')) {
        try {
          delete (el as unknown as Record<string, unknown>)[key];
        } catch {
          void 0;
        }
      }
    }
    if (el.dataset) {
      const keysToRemove = Object.keys(el.dataset).filter((k) =>
        prefixes.some((p) => k.toLowerCase().startsWith(p.toLowerCase()))
      );
      for (const k of keysToRemove) el.removeAttribute(`data-${k}`);
    }
    node = walker.nextNode();
  }
}

export const stripLeafletDomSignatures = (rootId: string): void =>
  stripDomExpandos(rootId, LEAFLET_PREFIXES);

export const stripHtml5QrDomSignatures = (rootId: string): void =>
  stripDomExpandos(rootId, HTML5QR_PREFIXES);
