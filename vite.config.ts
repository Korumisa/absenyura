import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3001';
  const proxyLogs =
    mode === 'development' &&
    (String(env.VITE_PROXY_LOG || '0') === '1' ||
      String(env.VITE_PROXY_LOG || '').toLowerCase() === 'true');

  return {
    plugins: [
      react({
        babel: {
          plugins: [...(mode === 'development' ? ['react-dev-locator'] : [])],
        },
      }),
      tsconfigPaths(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'E-Absensi',
          short_name: 'E-Absensi',
          description: 'Sistem absensi mahasiswa HM SDP',
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
          globIgnores: [
            '**/vendor-export*.js',
            '**/vendor-maps*.js',
            '**/vendor-charts*.js',
          ],
          maximumFileSizeToCacheInBytes: 2_000_000,
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-maps': ['leaflet', 'react-leaflet'],
            'vendor-qr': ['html5-qrcode'],
            'vendor-export': ['exceljs', 'jspdf', 'jspdf-autotable', 'html2canvas'],
            'vendor-motion': ['framer-motion'],
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          },
        },
      },
    },
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
