import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index.js';
import prisma from '../utils/prisma.js';
import { sendServiceUnavailable } from '../utils/errorResponse.js';

const TTL_MS = 24 * 60 * 60 * 1000;

function unavailable(res: Response, error: unknown) {
  sendServiceUnavailable(res, {
    error: 'Permintaan belum dapat dikonfirmasi. Tunggu 30 detik, periksa riwayat, lalu coba lagi.',
    reason: 'idempotency_unavailable',
    err: error,
  });
}

export const idempotency = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const key = req.header('X-Idempotency-Key');
  const userId = req.user?.id;
  if (!key || !userId) {
    next();
    return;
  }
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(key)) {
    res.status(400).json({ success: false, error: 'Kunci permintaan tidak valid.' });
    return;
  }

  const endpoint = `${req.method} ${req.baseUrl}${req.path}`;
  const cutoff = new Date(Date.now() - TTL_MS);
  try {
    // A unique INSERT is the reservation. Never run the mutation before it succeeds.
    try {
      await prisma.idempotencyKey.create({
        data: { key, user_id: userId, endpoint, consumed_at: new Date() },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error;
      const previous = await prisma.idempotencyKey.findUnique({ where: { key } });
      if (!previous || previous.user_id !== userId || previous.endpoint !== endpoint) {
        res.status(409).json({ success: false, error: 'Kunci permintaan sudah digunakan.' });
        return;
      }
      if (previous.consumed_at < cutoff) {
        // Compare-and-delete prevents concurrent requests from deleting a new reservation.
        const deleted = await prisma.idempotencyKey.deleteMany({
          where: { key, consumed_at: { lt: cutoff } },
        });
        if (deleted.count !== 1) {
          res.status(409).json({ success: false, error: 'Permintaan sedang diproses.' });
          return;
        }
        await prisma.idempotencyKey.create({
          data: { key, user_id: userId, endpoint, consumed_at: new Date() },
        });
      } else if (previous.response_status !== null && previous.response_body !== null) {
        if (previous.response_status === 503) res.setHeader('Retry-After', '30');
        res.status(previous.response_status).json(JSON.parse(previous.response_body));
        return;
      } else {
        res.setHeader('Retry-After', '30');
        res.status(409).json({
          success: false,
          error:
            'Permintaan sebelumnya masih diproses atau belum terkonfirmasi. Periksa riwayat sebelum mengirim ulang.',
          error_code: 'REQUEST_IN_PROGRESS',
        });
        return;
      }
    }
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Permintaan sedang diproses.' });
    } else {
      unavailable(res, error);
    }
    return;
  }

  const originalJson = res.json.bind(res);
  let finalizing = false;
  res.json = ((body: unknown) => {
    if (finalizing) return res;
    finalizing = true;
    const status = res.statusCode;
    // Persist before responding; finish-event writes can be suspended on serverless.
    void (async () => {
      try {
        await prisma.idempotencyKey.update({
          where: { key },
          data: { response_status: status, response_body: JSON.stringify(body ?? null) },
        });
        if (!res.destroyed) originalJson(body);
      } catch (error) {
        res.json = originalJson;
        if (!res.destroyed && !res.headersSent) unavailable(res, error);
      }
    })();
    return res;
  }) as Response['json'];
  next();
};
