import { Router, Request, Response } from 'express';
import { runCronJob } from '../jobs/cron.js';

const router = Router();

router.get('/trigger', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  // Requires CRON_SECRET to be configured in Vercel environment variables
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ success: false, error: 'Unauthorized cron trigger' });
    return;
  }
  
  try {
    // We execute the cron logic. It runs asynchronously to prevent Vercel from timing out.
    runCronJob().catch(err => console.error('Vercel cron job error:', err));
    res.status(200).json({ success: true, message: 'Cron job triggered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to trigger cron job' });
  }
});

export default router;
