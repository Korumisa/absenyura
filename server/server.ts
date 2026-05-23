/**
 * local server entry file, for local development
 */
import { createServer } from 'http';
import * as dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3001;

async function startLocalServer() {
  const [{ default: app }, { startCronJobs }] = await Promise.all([
    import('./app.js'),
    import('./jobs/cron.js'),
  ]);

  const server = createServer(app);

  startCronJobs();
  console.log('[Server] Cron jobs started');

  server.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`);
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
