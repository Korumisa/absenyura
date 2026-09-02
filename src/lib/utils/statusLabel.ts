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

export function sessionStatusLabel(status: string): string {
  return formatLabel('session-status', status);
}

export function attendanceStatusLabel(status: string): string {
  return formatLabel('attendance-status', status);
}

export function userRoleLabel(role: string): string {
  return formatLabel('user-role', role);
}

export function excuseStatusLabel(status: string): string {
  return formatLabel('excuse-status', status);
}

/** @deprecated Import attendanceBadgeVariant directly from @/lib/utils/classLabel.
 *  Re-exported here only to prevent duplicate-export ambiguity in the lib barrel;
 *  the single source of truth lives in classLabel.ts.
 */
export { attendanceBadgeVariant } from '@/lib/utils/classLabel';
