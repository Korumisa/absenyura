import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPage = Number.parseInt(String(req.query.page ?? ''), 10);
    const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip = (page - 1) * limit;
    const search = String(req.query.search ?? '').trim();
    const where = search
      ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' as const } },
            { target_table: { contains: search, mode: 'insensitive' as const } },
            { target_id: { contains: search, mode: 'insensitive' as const } },
            { actor_id: { contains: search, mode: 'insensitive' as const } },
            { ip_address: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
