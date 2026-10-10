// PM2 ecosystem config — jalankan dengan:
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//   pm2 startup (ikuti instruksi untuk enable auto-start boot)
//
// CATATAN: Config ini dioptimalkan untuk 1 VPS DUAL PURPOSE (8 GB RAM shared dengan Postgres).
//         JANGAN naikin instances > 1 atau max_memory_restart > 1500M — Postgres akan kehabisan RAM
//         dan terkena OOM kill kernel (data absensi beresiko korup restart kasar WAL recovery).
//
// Lihat DEPLOY_VPS_HOSTINGER.md / DEPLOY_VPS_DUAL_HOSTINGER.md untuk panduan lengkap.
module.exports = {
  apps: [
    {
      name: 'hmsdp-absenyura',
      script: './dist-server/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      // ==================== DUAL PURPOSE TUNING ==================================
      max_memory_restart: '1500M',
      // Jangan tambah --gc-interval / --optimize-for-size: flag debug V8, CPU naik drastis saat beban.
      // --env-file-if-exists: .env dimuat sebelum modul apa pun dievaluasi (bundle ESM meng-hoist import
      // paket eksternal di atas `import 'dotenv/config'`). Butuh Node >= 22.9.
      node_args: '--max-old-space-size=1536 --env-file-if-exists=.env',
      kill_timeout: 6000,       // 6s graceful shutdown — tunggu DB transaction commit
      restart_delay: 2500,      // Delay restart — hindari thrashing OOM loop postgres
      min_uptime: '30s',        // Kurang dari 30 detik bertahan = dianggap crash loop
      max_restarts: 10,
      listen_timeout: 10000,    // 10s app bind port 3001
      wait_ready: true,         // Kirim `process.send('ready')` jika app.listen() berhasil
      error_max_size: '10M',
      out_max_size: '10M',
      // ==========================================================================
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
        // Samakan dengan Vercel (UTC): setHours()/toLocaleString() tanpa timeZone di server.
        TZ: 'UTC',
      },
    },
  ],
};
