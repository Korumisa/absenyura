import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index.js';
import prisma from '../utils/prisma.js';

interface CachedResponse {
  status: number;
  body: unknown;
  consumedAt: number;
  endpoint: string;
}

interface IdempotencyDbEntry {
  key: string;
  consumed_at: Date;
  user_id: string;
  endpoint: string;
  response_status: number | null;
  response_body: string | null;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const idempotencyModelRaw = (prisma as unknown as { idempotencyKey?: any }).idempotencyKey;
const idempotencyModel = idempotencyModelRaw ?? null;

const responseCache = new Map<string, CachedResponse>();

const setupInMemoryInterception = (
  res: Response,
  cacheKey: string,
  now: number,
  endpoint: string,
  idempotencyKey: string
) => {
  const originalJson = res.json.bind(res);
  let interceptedBody: unknown;
  let interceptedStatus = res.statusCode;

  res.json = (body: unknown) => {
    interceptedBody = body;
    interceptedStatus = res.statusCode;
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body?: unknown) => {
    interceptedStatus = res.statusCode;
    if (typeof body === 'string') {
      try {
        interceptedBody = JSON.parse(body);
      } catch {
        interceptedBody = body;
      }
    } else if (body !== undefined) {
      interceptedBody = body;
    }
    return originalSend(body as never);
  };

  res.on('finish', () => {
    if (res.statusCode < 500) {
      responseCache.set(cacheKey, {
        status: res.statusCode,
        body: interceptedBody,
        consumedAt: now,
        endpoint,
      });

      if (idempotencyModel) {
        idempotencyModel
          .update({
            where: { key: idempotencyKey },
            data: {
              response_status: interceptedStatus ?? res.statusCode,
              response_body:
                typeof interceptedBody === 'string'
                  ? interceptedBody
                  : JSON.stringify(interceptedBody ?? null),
            },
          })
          .catch(() => undefined);
      }
    }
  });

  return { interceptedStatus, interceptedBody };
};

export const idempotency = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const idempotencyKey = req.header('X-Idempotency-Key');
  const userId = req.user?.id;

  if (!idempotencyKey || !userId) {
    next();
    return;
  }

  const cacheKey = `${userId}:${idempotencyKey}`;
  const now = Date.now();
  const endpoint = `${req.method} ${req.baseUrl}${req.path}`;

  const cached = responseCache.get(cacheKey);
  if (cached) {
    const age = now - cached.consumedAt;
    if (age < TWENTY_FOUR_HOURS_MS) {
      res.status(cached.status).json(cached.body);
      return;
    }
    responseCache.delete(cacheKey);
  }

  if (!idempotencyModel) {
    console.warn(
      '[idempotency] Prisma IdempotencyKey model not available; skipping DB check (only in-memory cache works). Run prisma generate after applying migration.'
    );
    setupInMemoryInterception(res, cacheKey, now, endpoint, idempotencyKey);
    next();
    return;
  }

  idempotencyModel
    .findUnique({ where: { key: idempotencyKey } })
    .then((dbEntry: IdempotencyDbEntry | null) => {
      if (dbEntry && dbEntry.user_id === userId) {
        const age = now - dbEntry.consumed_at.getTime();
        if (age < TWENTY_FOUR_HOURS_MS) {
          if (dbEntry.response_status && dbEntry.response_body) {
            const status = dbEntry.response_status;
            let body: unknown = dbEntry.response_body;
            try {
              body = JSON.parse(dbEntry.response_body);
            } catch {
              // noop, use raw string
            }
            res.status(status).json(body);
            return;
          } else {
            console.warn(
              '[idempotency] Legacy idempotency hit: response_body missing; falling back to generic 409.'
            );
            res.status(409).json({
              success: false,
              error: 'Idempotent request already processed within the last 24 hours.',
              idempotency_key: idempotencyKey,
            });
            return;
          }
        } else {
          idempotencyModel.delete({ where: { key: idempotencyKey } }).catch(() => undefined);
        }
      } else if (dbEntry && dbEntry.user_id !== userId) {
        res.status(409).json({
          success: false,
          error: 'Idempotency key is already in use by another request.',
          idempotency_key: idempotencyKey,
        });
        return;
      }

      let interceptedStatus = res.statusCode;
      let interceptedBody: unknown;

      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        interceptedBody = body;
        interceptedStatus = res.statusCode;
        return originalJson(body);
      };

      const originalSend = res.send.bind(res);
      res.send = (body?: unknown) => {
        interceptedStatus = res.statusCode;
        if (typeof body === 'string') {
          try {
            interceptedBody = JSON.parse(body);
          } catch {
            interceptedBody = body;
          }
        } else if (body !== undefined) {
          interceptedBody = body;
        }
        return originalSend(body as never);
      };

      idempotencyModel
        .create({
          data: {
            key: idempotencyKey,
            user_id: userId,
            endpoint,
            consumed_at: new Date(now),
            response_status: interceptedStatus ?? res.statusCode,
            response_body:
              typeof interceptedBody === 'string'
                ? interceptedBody
                : JSON.stringify(interceptedBody ?? null),
          },
        })
        .catch(() => undefined);

      res.on('finish', () => {
        if (res.statusCode < 500) {
          responseCache.set(cacheKey, {
            status: res.statusCode,
            body: interceptedBody,
            consumedAt: now,
            endpoint,
          });

          idempotencyModel
            .update({
              where: { key: idempotencyKey },
              data: {
                response_status: interceptedStatus ?? res.statusCode,
                response_body:
                  typeof interceptedBody === 'string'
                    ? interceptedBody
                    : JSON.stringify(interceptedBody ?? null),
              },
            })
            .catch(() => undefined);
        }
      });

      next();
      return undefined;
    })
    .catch(() => {
      setupInMemoryInterception(res, cacheKey, now, endpoint, idempotencyKey);
      next();
      return undefined;
    });
};
