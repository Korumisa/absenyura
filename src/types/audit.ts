export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}
