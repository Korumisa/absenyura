export interface Report {
  id: string;
  user_name: string;
  nim_nip: string;
  session_title: string;
  class_name: string | null;
  session_classes?: string[];
  student_class_id?: string | null;
  student_class_label?: string | null;
  session_id: string;
  user_id: string;
  session_date: string;
  check_in_time: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'SICK' | 'EXCUSED';
  ip: string;
  device: string;
  photo_url: string | null;
  excuse_proof_url?: string | null;
  excuse_description?: string | null;
  excuse_reason?: 'SICK' | 'EXCUSED' | null;
}

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
