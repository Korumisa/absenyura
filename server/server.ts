/**
 * local server entry file, for local development
 */
import { createServer } from 'http';

const PORT = process.env.PORT || 3001;

export let io: any;

async function startLocalServer() {
  const [{ default: app }, { initSocket }, { startCronJobs }] = await Promise.all([
    import('./app.js'),
    import('./socket/index.js'),
    import('./jobs/cron.js'),
  ]);

  const server = createServer(app);

  io = initSocket(server);
  startCronJobs();

  server.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`);
  });

  /**
   * close server
   */
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

/**
 * close server
 */
if (!process.env.VERCEL) {
  startLocalServer();
}
