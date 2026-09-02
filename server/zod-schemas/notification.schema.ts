import { z } from 'zod';

export const NotificationParams = z.object({
  id: z.string().trim().uuid('Format notification_id tidak valid'),
});

export const UpdateProfileBody = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email('Format email tidak valid').optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(8, 'Kata sandi baru minimal 8 karakter').optional(),
});

export const UpdateDepartmentsBody = z.object({
  data: z.array(z.any()),
});

export const UpdateSubjectsBody = z.object({
  data: z.array(z.any()),
});

export const UserParams = z.object({
  id: z.string().trim().uuid('Format user_id tidak valid'),
});

export const SessionParams = z.object({
  id: z.string().trim().uuid('Format session_id tidak valid'),
});

export const ClassParams = z.object({
  id: z.string().trim().uuid('Format class_id tidak valid'),
});

export const EnrollParams = z.object({
  id: z.string().trim().uuid('Format class_id tidak valid'),
  student_id: z.string().trim().uuid('Format student_id tidak valid'),
});

export const ExcuseParams = z.object({
  id: z.string().trim().uuid('Format excuse_id tidak valid'),
});

export const LocationParams = z.object({
  id: z.string().trim().uuid('Format location_id tidak valid'),
});

export const StructureCabinetParams = z.object({
  id: z.string().trim().uuid('Format cabinet_id tidak valid'),
});

export const ProgramParams = z.object({
  id: z.string().trim().uuid('Format program_id tidak valid'),
});

export const CategoryParams = z.object({
  id: z.string().trim().uuid('Format category_id tidak valid'),
});

export const PostParams = z.object({
  id: z.string().trim().uuid('Format post_id tidak valid'),
  slug: z.string().trim().optional(),
});

export const GalleryParams = z.object({
  id: z.string().trim().uuid('Format gallery_id tidak valid'),
});

export const RecruitmentParams = z.object({
  id: z.string().trim().uuid('Format recruitment_id tidak valid'),
});

export const AttendanceCheckoutParams = z.object({
  id: z.string().trim().uuid('Format attendance_id tidak valid'),
});

export type NotificationParamsType = z.infer<typeof NotificationParams>;
export type UpdateProfileBodyType = z.infer<typeof UpdateProfileBody>;
export type UpdateDepartmentsBodyType = z.infer<typeof UpdateDepartmentsBody>;
export type UpdateSubjectsBodyType = z.infer<typeof UpdateSubjectsBody>;
