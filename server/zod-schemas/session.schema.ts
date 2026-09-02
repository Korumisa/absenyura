import { z } from 'zod';

export const CreateSessionBody = z.object({
  title: z.string().trim().min(1, 'Judul sesi wajib diisi'),
  description: z.string().trim().nullable().optional(),
  class_id: z.string().trim().uuid('Format class_id tidak valid').nullable().optional(),
  class_ids: z.array(z.string().trim().uuid('Format class_id tidak valid')).optional(),
  location_id: z
    .string()
    .trim()
    .uuid('Lokasi sesi wajib dipilih')
    .min(1, 'Lokasi sesi wajib dipilih'),
  qr_mode: z.enum(['NONE', 'STATIC', 'DYNAMIC']).default('NONE'),
  session_start: z.coerce.date(),
  session_end: z.coerce.date(),
  check_in_open_at: z.coerce.date(),
  check_in_close_at: z.coerce.date(),
  late_threshold_minutes: z.coerce
    .number()
    .int()
    .min(0, 'Threshold keterlambatan tidak boleh negatif')
    .default(15),
  require_checkout: z.boolean().default(false),
});

export const UpdateSessionBody = z.object({
  title: z.string().trim().min(1, 'Judul sesi wajib diisi').optional(),
  description: z.string().trim().nullable().optional(),
  class_id: z.string().trim().uuid('Format class_id tidak valid').nullable().optional(),
  class_ids: z.array(z.string().trim().uuid('Format class_id tidak valid')).optional(),
  location_id: z
    .string()
    .trim()
    .uuid('Format location_id tidak valid')
    .min(1, 'Lokasi sesi wajib dipilih')
    .optional(),
  qr_mode: z.enum(['NONE', 'STATIC', 'DYNAMIC']).optional(),
  session_start: z.coerce.date().optional(),
  session_end: z.coerce.date().optional(),
  check_in_open_at: z.coerce.date().optional(),
  check_in_close_at: z.coerce.date().optional(),
  late_threshold_minutes: z.coerce
    .number()
    .int()
    .min(0, 'Threshold keterlambatan tidak boleh negatif')
    .optional(),
  require_checkout: z.boolean().optional(),
  status: z.enum(['UPCOMING', 'ACTIVE', 'CLOSED']).optional(),
});

export type CreateSessionBodyType = z.infer<typeof CreateSessionBody>;
export type UpdateSessionBodyType = z.infer<typeof UpdateSessionBody>;
