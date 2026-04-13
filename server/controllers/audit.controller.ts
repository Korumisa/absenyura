import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 100, // Limit for performance
    });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};