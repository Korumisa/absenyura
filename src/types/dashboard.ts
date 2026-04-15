export interface Location {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  title: string;
  location: Location;
  creator: { name: string };
  class_id?: string | null;
  class?: { id: string; name: string } | null;
  qr_mode: 'DYNAMIC' | 'STATIC' | 'NONE';
  session_start: string;
  session_end: string;
  check_in_open_at: string;
  check_in_close_at: string;
  require_checkout: boolean;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}