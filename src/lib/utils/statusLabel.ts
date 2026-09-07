/** @deprecated Use the single source of truth in @/lib/utils/classLabel instead.
 *
 * Prefer:
 *   import { formatLabel } from '@/lib/utils/classLabel';
 *   formatLabel('session-status', status)
 *   formatLabel('attendance-status', status)
 *   formatLabel('user-role', role)
 *   formatLabel('excuse-status', status)
 *
 * and for badges:
 *   import { attendanceBadgeVariant } from '@/lib/utils/classLabel';
 */
import { formatLabel } from '@/lib/utils/classLabel';
import { attendanceStatusLabel as classLabelAttendanceStatusLabel } from '@/lib/utils/classLabel';

export function sessionStatusLabel(status: string): string {
  return formatLabel('session-status', status);
}

export function attendanceStatusLabel(status: string): string {
  return classLabelAttendanceStatusLabel(status);
}

export function userRoleLabel(role: string): string {
  return formatLabel('user-role', role);
}

export function excuseStatusLabel(status: string): string {
  return formatLabel('excuse-status', status);
}

export { attendanceBadgeVariant } from '@/lib/utils/classLabel';
