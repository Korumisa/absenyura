import { Router, Request, Response } from 'express';
import {
  runCronJob,
  runNonceCleanupJob,
  runPhotoCleanupJob,
  runSemesterUpdateJob,
} from '../jobs/cron.js';

const router = Router();

type CronJobType = 'session' | 'photo' | 'semester' | 'daily' | 'all';

router.get('/trigger', async (req: Request, res: Response): Promise<void> => {
  const job = (String(req.query.job || 'session').toLowerCase() as CronJobType) || 'session';

  const startedAt = Date.now();
  try {
    const allowedJobs: CronJobType[] = ['session', 'photo', 'semester', 'daily', 'all'];
    if (!allowedJobs.includes(job)) {
      res.status(400).json({ success: false, error: 'Invalid cron job' });
      return;
    }

    const jobs: Array<Promise<void>> = [];
    if (job === 'session' || job === 'all') {
      jobs.push(runCronJob());
    }
    if (job === 'daily' || job === 'all') {
      jobs.push(runNonceCleanupJob());
    }
    if (job === 'photo' || job === 'daily' || job === 'all') {
      jobs.push(runPhotoCleanupJob());
    }
    if (job === 'semester' || job === 'daily' || job === 'all') {
      jobs.push(runSemesterUpdateJob());
    }
    await Promise.all(jobs);

    const durationMs = Date.now() - startedAt;
    console.info('[Cron] job completed', { job, durationMs });

    res.status(200).json({
      success: true,
      message: 'Cron job triggered',
      job,
      triggeredAt: new Date().toISOString(),
      durationMs,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to trigger cron job' });
  }
});

export default router;
