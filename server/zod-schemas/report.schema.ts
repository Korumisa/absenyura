import { z } from 'zod';

export const ReportQuery = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  withSummary: z.string().optional(),
  withClassBreakdown: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sessionId: z.string().optional(),
  session_id: z.string().optional(),
  classId: z.string().optional(),
  class_id: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  userId: z.string().optional(),
  user_id: z.string().optional(),
  studentId: z.string().optional(),
  student_id: z.string().optional(),
});

export const DashboardQuery = z.object({
  range: z.union([z.string(), z.number()]).optional(),
});

export const AuditLogQuery = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  search: z.string().optional(),
});

export type ReportQueryType = z.infer<typeof ReportQuery>;
export type DashboardQueryType = z.infer<typeof DashboardQuery>;
export type AuditLogQueryType = z.infer<typeof AuditLogQuery>;
