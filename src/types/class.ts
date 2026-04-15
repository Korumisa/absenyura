export interface ClassItem {
  id: string;
  name: string;
  course_code: string | null;
  description: string | null;
  lecturer_id: string;
  lecturer: { name: string };
  _count: { enrollments: number, sessions: number };
}
