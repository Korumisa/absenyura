import { z } from 'zod';

export const CreateLocationBody = z.object({
  name: z.string().trim().min(1, 'Nama lokasi wajib diisi'),
  address: z.string().trim().nullable().optional(),
  latitude: z.union([z.string(), z.number()]),
  longitude: z.union([z.string(), z.number()]),
  radius: z.union([z.string(), z.number()]).optional(),
  wifi_bssid: z.array(z.string()).nullable().optional(),
});

export const UpdateLocationBody = z.object({
  name: z.string().trim().min(1, 'Nama lokasi wajib diisi').optional(),
  address: z.string().trim().nullable().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  radius: z.union([z.string(), z.number()]).optional(),
  wifi_bssid: z.array(z.string()).nullable().optional(),
});

export type CreateLocationBodyType = z.infer<typeof CreateLocationBody>;
export type UpdateLocationBodyType = z.infer<typeof UpdateLocationBody>;
