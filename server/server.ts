/**
 * local server entry file, for local development
 */
import 'dotenv/config';
import { createServer } from 'http';

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

async function startLocalServer() {
  const [{ default: app }, { startCronJobs }] = await Promise.all([
    import('./app.js'),
    import('./jobs/cron.js'),
  ]);

  const server = createServer(app);

  startCronJobs();
  console.log('[Server] Cron jobs started');

  server.listen(PORT, HOST, () => {
    console.log(`Server ready on ${HOST}:${PORT}`);
    if (process.send) {
      try {
        process.send('ready');
      } catch {
        /* ignore IPC errors non-PM2 context */
      }
    }
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

if (!process.env.VERCEL) {
  startLocalServer();
}
