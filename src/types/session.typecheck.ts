import type { Session } from '@/types/session';

const _session: Session = {
  id: 'session-id',
  title: 'Session Title',
  location: { id: 'loc-id', name: 'Location Name' },
  creator: { name: 'Creator' },
  class_id: null,
  class: null,
  qr_mode: 'NONE',
  session_start: new Date().toISOString(),
  session_end: new Date().toISOString(),
  check_in_open_at: new Date().toISOString(),
  check_in_close_at: new Date().toISOString(),
  require_checkout: false,
  status: 'UPCOMING',
};

void _session;
