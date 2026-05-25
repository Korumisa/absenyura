import { Router, Request, Response } from 'express';
import { runCronJob, runPhotoCleanupJob, runSemesterUpdateJob } from '../jobs/cron.js';

const router = Router();

type CronJobType = 'session' | 'photo' | 'semester' | 'daily' | 'all';

router.get('/trigger', async (req: Request, res: Response): Promise<void> => {
  const job = (String(req.query.job || 'session').toLowerCase() as CronJobType) || 'session';

  try {
    const run = (fn: () => Promise<void>, label: string) => {
      fn().catch((err) => console.error(`[Cron] Vercel ${label} error:`, err));
    };

    if (job === 'session' || job === 'all') {
      run(runCronJob, 'session');
    }
    if (job === 'photo' || job === 'daily' || job === 'all') {
      run(runPhotoCleanupJob, 'photo');
    }
    if (job === 'semester' || job === 'daily' || job === 'all') {
      run(runSemesterUpdateJob, 'semester');
    }

    res.status(200).json({
      success: true,
      message: 'Cron job triggered',
      job,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to trigger cron job' });
  }
});

export default router;
