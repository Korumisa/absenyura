export interface Excuse {
  id: string;
  user_id: string;
  session_id: string;
  reason: string;
  description: string;
  proof_url: string | null;
  status: string;
  created_at: string;
  user: { name: string, nim_nip: string };
  session: { title: string, session_start: string, class: { name: string } | null };
  reviewer: { name: string } | null;
}
