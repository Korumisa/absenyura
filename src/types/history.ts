export interface AttendanceHistory {
  id: string;
  session_title: string;
  class_name: string | null;
  session_date: string;
  check_in_time: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'SICK' | 'EXCUSED';
  ip: string;
  device: string;
  photo_url?: string;
}