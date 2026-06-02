/** Muat stylesheet Google Font tanpa memblokir render halaman admin */
export function loadGoogleStylesheet(href: string, id: string): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
}

const CORMORANT_HREF =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap';

export function loadCormorantDisplayFont(): void {
  const run = () => loadGoogleStylesheet(CORMORANT_HREF, 'font-cormorant-garamond');

  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
    return;
  }
  setTimeout(run, 200);
}
