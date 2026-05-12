import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa';
import { getPublicSiteMock } from './src/dev/publicSiteMock';
import { getApiMock } from './src/dev/apiMock';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3001';
  const proxyLogs =
    mode === 'development' &&
    (String(env.VITE_PROXY_LOG || '0') === '1' ||
      String(env.VITE_PROXY_LOG || '').toLowerCase() === 'true');
  const useDummyPublicSite =
    mode === 'development' &&
    String(env.VITE_USE_DUMMY_PUBLIC_SITE || '0') !== '0' &&
    String(env.VITE_USE_DUMMY_PUBLIC_SITE || '').toLowerCase() !== 'false';

  return {
    plugins: [
      {
        name: 'public-site-mock',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!useDummyPublicSite) return next();
            const url = req.url || '';
            const mockedApi = getApiMock(url, String(req.method || 'GET'));
            if (mockedApi) {
              res.statusCode = mockedApi.status;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(mockedApi.body));
              return;
            }
            const mocked = getPublicSiteMock(url);
            if (!mocked) return next();
            res.statusCode = mocked.status;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(mocked.body));
          });
        },
      },
      react({
        babel: {
          plugins: [
            'react-dev-locator',
          ],
        },
      }),
      tsconfigPaths(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Absensyura Campus',
          short_name: 'Absensyura',
          description: 'Sistem Absensi Mahasiswa Modern',
          theme_color: '#4f46e5',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5000000, // <== Added to allow large chunk caching
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.ipify\.org\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'ipify-api-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    server: {
      host: '0.0.0.0',
      hmr: {
        clientPort: 443
      },
      watch: {
        ignored: ['**/.pnpm-store/**'],
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            if (proxyLogs) {
              proxy.on('error', (err) => {
                console.log('proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req) => {
                console.log('Sending Request to the Target:', req.method, req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
              });
            }
          },
        }
      }
    }
  };
})
