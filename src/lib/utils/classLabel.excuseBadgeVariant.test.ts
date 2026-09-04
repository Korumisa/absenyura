import { describe, expect, it } from 'vitest';
import {
  attendanceBadgeVariant,
  excuseBadgeVariant,
  excuseReasonLabel,
  type AttendanceBadgeVariant,
  type ExcuseBadgeVariant,
} from './classLabel';

describe('BATCH1 B1-1: UX-SYS-001 Badge Variant SICK/EXCUSED centralized helpers', () => {
  describe('attendanceBadgeVariant', () => {
    it('returns success for PRESENT status', () => {
      expect(attendanceBadgeVariant('PRESENT')).toBe<AttendanceBadgeVariant>('success');
    });

    it('returns destructive for ABSENT status', () => {
      expect(attendanceBadgeVariant('ABSENT')).toBe<AttendanceBadgeVariant>('destructive');
    });

    it('returns sick for SICK status — BUKAN secondary abu (regression UX-SYS-001)', () => {
      const result = attendanceBadgeVariant('SICK');
      expect(result).toBe<AttendanceBadgeVariant>('sick');
      expect(result).not.toBe('secondary');
    });

    it('returns excused for EXCUSED status — BUKAN secondary abu (regression UX-SYS-001)', () => {
      const result = attendanceBadgeVariant('EXCUSED');
      expect(result).toBe<AttendanceBadgeVariant>('excused');
      expect(result).not.toBe('secondary');
    });

    it('fallback ke secondary untuk unknown status', () => {
      expect(attendanceBadgeVariant('XYZ_UNKNOWN')).toBe<AttendanceBadgeVariant>('secondary');
    });
  });

  describe('excuseBadgeVariant + excuseReasonLabel (E-SYS-001 centralized)', () => {
    it('SICK → variant sick, label Sakti', () => {
      expect(excuseBadgeVariant('SICK')).toBe<ExcuseBadgeVariant>('sick');
      expect(excuseReasonLabel('SICK')).toBe('Sakit');
    });

    it('EXCUSED → variant excused, label Izin', () => {
      expect(excuseBadgeVariant('EXCUSED')).toBe<ExcuseBadgeVariant>('excused');
      expect(excuseReasonLabel('EXCUSED')).toBe('Izin');
    });

    it('unknown reason fallback', () => {
      expect(excuseBadgeVariant('OTHER')).toBe('secondary');
      expect(excuseReasonLabel('OTHER')).toBe('OTHER');
    });

    it('empty/null reason fallback ke "-" atau secondary', () => {
      expect(excuseReasonLabel('')).toBe('-');
      expect(excuseBadgeVariant('')).toBe('secondary');
    });
  });
});
