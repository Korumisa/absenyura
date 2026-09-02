import { z } from 'zod';

export const LoginBody = z.object({
  nim: z.string().trim().min(1, 'NIM/NIP wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
  device_fingerprint: z.string().trim().optional(),
});

export const RegisterBody = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  nim_nip: z.string().trim().min(1, 'NIM/NIP wajib diisi'),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  semester: z.coerce.number().int().positive('Semester harus bilangan positif').optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN']).default('USER'),
});

export const RefreshBody = z.object({
  device_fingerprint: z.string().trim().optional(),
});

export type LoginBodyType = z.infer<typeof LoginBody>;
export type RegisterBodyType = z.infer<typeof RegisterBody>;
export type RefreshBodyType = z.infer<typeof RefreshBody>;
