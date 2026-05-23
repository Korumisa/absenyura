/** Shared Prisma select shapes for session list/dashboard — reduces row payload & join cost */

const locationListSelect = { id: true, name: true } as const;

const classWithSemesterSelect = { id: true, name: true, semester: true } as const;
const classWithoutSemesterSelect = { id: true, name: true } as const;

export function sessionListRelations(opts: { userId?: string; withSemester: boolean }) {
  const classSelect = opts.withSemester ? classWithSemesterSelect : classWithoutSemesterSelect;
  return {
    location: { select: locationListSelect },
    creator: { select: { name: true } },
    class: { select: classSelect },
    session_classes: { select: { class: { select: classSelect } } },
    ...(opts.userId
      ? {
          attendances: {
            where: { user_id: opts.userId },
            select: { id: true, check_out_time: true, status: true },
          },
        }
      : {}),
  };
}

/** Attend page + check-in geofencing */
export const locationAttendSelect = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
  radius: true,
  wifi_bssid: true,
} as const;

/** check-in handler — session fields only */
export const sessionCheckInSelect = {
  id: true,
  status: true,
  class_id: true,
  qr_mode: true,
  qr_token: true,
  qr_secret: true,
  session_start: true,
  session_end: true,
  check_in_open_at: true,
  check_in_close_at: true,
  late_threshold_minutes: true,
  require_checkout: true,
  session_classes: { select: { class_id: true } },
  location: { select: locationAttendSelect },
} as const;
