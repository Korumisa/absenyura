import { z } from 'zod';

export const CreateClassBody = z.object({
  name: z.string().trim().min(1, 'Nama kelas wajib diisi'),
  course_code: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  lecturer_id: z.string().trim().uuid('Format lecturer_id tidak valid').optional(),
  semester: z.coerce
    .number()
    .int()
    .min(1, 'Semester minimal 1')
    .max(14, 'Semester maksimal 14')
    .default(1),
});

export const UpdateClassBody = z.object({
  name: z.string().trim().min(1, 'Nama kelas wajib diisi').optional(),
  course_code: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  lecturer_id: z.string().trim().uuid('Format lecturer_id tidak valid').optional(),
  semester: z.coerce
    .number()
    .int()
    .min(1, 'Semester minimal 1')
    .max(14, 'Semester maksimal 14')
    .optional(),
});

export const EnrollStudentsBody = z.object({
  student_ids: z
    .array(z.string().trim().uuid('Format student_id tidak valid'))
    .min(1, 'Minimal 1 mahasiswa wajib dipilih'),
});

export type CreateClassBodyType = z.infer<typeof CreateClassBody>;
export type UpdateClassBodyType = z.infer<typeof UpdateClassBody>;
export type EnrollStudentsBodyType = z.infer<typeof EnrollStudentsBody>;
