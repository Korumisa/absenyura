/**
 * local server entry file, for local development
 */
import app from './app.js';
import { createServer } from 'http';
import { initSocket } from './socket/index.js';
import { startCronJobs } from './jobs/cron.js';

const PORT = process.env.PORT || 3001;

const server = createServer(app);

// Initialize Socket.io
export const io = initSocket(server);

// Start background cron jobs
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

export default app;