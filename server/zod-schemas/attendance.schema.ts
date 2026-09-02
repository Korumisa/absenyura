import { z } from 'zod';

export const CheckinBody = z.object({
  session_id: z
    .string()
    .trim()
    .uuid('Format session_id tidak valid')
    .min(1, 'Session ID wajib diisi'),
  qr_token: z.string().trim().optional(),
  latitude: z.union([z.string(), z.number()]),
  longitude: z.union([z.string(), z.number()]),
  accuracy: z.union([z.string(), z.number()]),
  ip_address: z.string().trim().optional(),
  device_fingerprint: z.string().trim().optional(),
  nonce: z.string().trim().optional(),
  signature: z.string().trim().optional(),
  photo_size: z.union([z.string(), z.number()]).optional(),
  photo_type: z.string().trim().optional(),
});

export const CheckoutBody = z.object({
  qr_token: z.string().trim().optional(),
  latitude: z.union([z.string(), z.number()]),
  longitude: z.union([z.string(), z.number()]),
  accuracy: z.union([z.string(), z.number()]),
  device_fingerprint: z.string().trim().optional(),
  nonce: z.string().trim().optional(),
  signature: z.string().trim().optional(),
  photo_size: z.union([z.string(), z.number()]).optional(),
  photo_type: z.string().trim().optional(),
});

export const OverrideAttendanceBody = z.object({
  session_id: z
    .string()
    .trim()
    .uuid('Format session_id tidak valid')
    .min(1, 'Session ID wajib diisi'),
  user_id: z.string().trim().uuid('Format user_id tidak valid').min(1, 'User ID wajib diisi'),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'SICK', 'EXCUSED']),
  notes: z.string().trim().optional(),
});

export type CheckinBodyType = z.infer<typeof CheckinBody>;
export type CheckoutBodyType = z.infer<typeof CheckoutBody>;
export type OverrideAttendanceBodyType = z.infer<typeof OverrideAttendanceBody>;
