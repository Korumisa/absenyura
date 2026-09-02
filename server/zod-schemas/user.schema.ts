import { z } from 'zod';

export const CreateUserBody = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid').min(1, 'Email wajib diisi'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').min(1, 'Kata sandi wajib diisi'),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN']).default('USER'),
  nim_nip: z.string().trim().min(1, 'NIM/NIP wajib diisi'),
  department: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  semester: z.coerce.number().int().positive('Semester harus bilangan positif').optional(),
  class_ids: z.array(z.string().trim().uuid('Format class_id tidak valid')).optional(),
});

export const UpdateUserBody = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').optional(),
  email: z.string().trim().email('Format email tidak valid').optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN']).optional(),
  nim_nip: z.string().trim().min(1, 'NIM/NIP wajib diisi').optional(),
  department: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').optional(),
  semester: z.coerce.number().int().positive('Semester harus bilangan positif').optional(),
  class_ids: z.array(z.string().trim().uuid('Format class_id tidak valid')).optional(),
});

export const ImportUsersBody = z.object({
  importEnrollmentYearMode: z.enum(['CURRENT_YEAR', 'PREVIOUS_YEAR']).optional(),
});

export type CreateUserBodyType = z.infer<typeof CreateUserBody>;
export type UpdateUserBodyType = z.infer<typeof UpdateUserBody>;
export type ImportUsersBodyType = z.infer<typeof ImportUsersBody>;
