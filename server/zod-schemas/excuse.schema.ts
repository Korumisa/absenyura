import { z } from 'zod';

export const CreateExcuseBody = z.object({
  session_id: z
    .string()
    .trim()
    .uuid('Format session_id tidak valid')
    .min(1, 'Session ID wajib diisi'),
  reason: z.enum(['SICK', 'EXCUSED']),
  description: z.string().trim().nullable().optional(),
  nonce: z.string().trim().optional(),
  signature: z.string().trim().optional(),
  photo_size: z.union([z.string(), z.number()]).optional(),
  photo_type: z.string().trim().optional(),
});

export const ReviewExcuseBody = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export type CreateExcuseBodyType = z.infer<typeof CreateExcuseBody>;
export type ReviewExcuseBodyType = z.infer<typeof ReviewExcuseBody>;
