export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  nim_nip: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  semester?: number;
  enrollment_date?: string;
  device_fingerprint?: string | null;
}
