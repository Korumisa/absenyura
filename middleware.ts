export const config = {
  matcher: [
    '/((?!_next|_vercel|api|assets|favicon\\.svg|logo-hmsdp\\.png|logo-hmsdp\\.webp|manifest\\.webmanifest|robots\\.txt|sw\\.js|registerSW\\.js|workbox-.*\\.js).*)',
  ],
};

const SITE_URL = 'https://hmsdp.vercel.app';

const KNOWN_PUBLIC_ROUTES: readonly string[] = [
  '/',
  '/berita',
  '/struktur-organisasi',
  '/program-kerja',
  '/informasi-lomba',
  '/informasi',
  '/galeri',
  '/open-recruitment',
  '/login',
  '/forbidden',
  '/attend',
  '/callback',
  '/404.html',
];

const KNOWN_PREFIX_ROUTES: readonly string[] = [
  '/dashboard',
  '/sessions',
  '/reports',
  '/users',
  '/classes',
  '/locations',
  '/excuses',
  '/history',
  '/settings',
  '/audit',
  '/master-data',
  '/public-site',
  '/berita/',
  '/program-kerja/',
];

function hasStaticExtension(pathname: string): boolean {
  return /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|woff|ttf|eot|css|js|map|webmanifest|pdf|txt|xml|json)$/i.test(pathname);
}

function isKnownRoute(pathname: string): boolean {
  if (KNOWN_PUBLIC_ROUTES.includes(pathname)) return true;
  for (const prefix of KNOWN_PREFIX_ROUTES) {
    if (pathname === prefix || pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

const NOT_FOUND_HTML = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow, nosnippet, noarchive" />
    <title>404 — Halaman Tidak Ditemukan | E-Absensi</title>
    <meta name="description" content="Halaman yang Anda cari tidak ditemukan atau sudah dipindahkan." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <style>
      :root{--brand-50:#eff6ff;--brand-600:#2563eb;--brand-700:#1d4ed8;--ink-200:#e2e8f0;--ink-500:#64748b;--ink-900:#0f172a}
      *{box-sizing:border-box}html,body{margin:0;padding:0;height:100%}
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(180deg,var(--brand-50) 0%,#fff 60%);color:var(--ink-900);display:flex;align-items:center;justify-content:center;padding:24px;-webkit-font-smoothing:antialiased}
      .card{width:100%;max-width:480px;background:#fff;border:1px solid var(--ink-200);border-radius:20px;box-shadow:0 20px 50px -20px rgba(37,99,235,.18);padding:40px 32px;text-align:center}
      .logo{width:72px;height:72px;margin:0 auto 16px;border-radius:16px;display:block}
      .code{font-size:72px;line-height:1;font-weight:800;letter-spacing:-.02em;background:linear-gradient(135deg,var(--brand-600),var(--brand-700));-webkit-background-clip:text;background-clip:text;color:transparent;margin:12px 0 4px}
      h1{font-size:22px;font-weight:700;margin:8px 0 8px}p{font-size:15px;line-height:1.6;color:var(--ink-500);margin:0 0 28px}
      .btn{display:inline-flex;align-items:center;gap:8px;background:var(--brand-600);color:#fff;padding:12px 22px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;will-change:transform}.btn:hover{background:var(--brand-700)}
      @media(min-width:640px){.card{padding:48px 40px}.code{font-size:84px}}
    </style>
  </head>
  <body>
    <main class="card" role="main">
      <img class="logo" src="/logo-hmsdp.webp" alt="Logo HM SDP Undiksha" onerror="this.src='/logo-hmsdp.png'" />
      <div class="code" aria-label="Kode status 404">404</div>
      <h1>Halaman Tidak Ditemukan</h1>
      <p>Alamat yang Anda tuju tidak tersedia, sudah dipindahkan, atau mungkin salah ketik.</p>
      <a class="btn" href="/">&#8592; Kembali ke Beranda</a>
    </main>
  </body>
</html>`;

function notFoundResponse(): Response {
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy':
        "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self' https:; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: wss:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://vercel.live; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests",
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    },
  });
}

export default function middleware(request: Request): Response | undefined {
  const url = new URL(request.url);
  const { pathname } = url;

  if (hasStaticExtension(pathname)) {
    return undefined;
  }

  const accept = request.headers.get('accept') ?? '';
  const wantsHtml = accept.includes('text/html') || accept.includes('*/*');

  if (isKnownRoute(pathname)) {
    return undefined;
  }

  if (wantsHtml) {
    return notFoundResponse();
  }

  return undefined;
}

export { SITE_URL };
