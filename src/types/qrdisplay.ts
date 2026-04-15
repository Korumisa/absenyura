export interface Attendee {
  id: string;
  user_name: string;
  nim_nip: string;
  status: string;
  check_in_time: string;
  check_out_time?: string | null;
}
