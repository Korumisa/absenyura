import { describe, expect, test } from 'vitest';
import {
  MAX_AUTO_RETRIES,
  computeIsPending,
  shouldShowErrorUi,
  shouldShowSlowLoadingHint,
} from './swrPageStateLogic';

describe('swrPageStateLogic', () => {
  test('shouldShowErrorUi only when fetch failed after max retries', () => {
    expect(shouldShowErrorUi(false, MAX_AUTO_RETRIES)).toBe(false);
    expect(shouldShowErrorUi(true, MAX_AUTO_RETRIES - 1)).toBe(false);
    expect(shouldShowErrorUi(true, MAX_AUTO_RETRIES)).toBe(true);
  });

  test('shouldShowSlowLoadingHint when slow without error and no data', () => {
    expect(shouldShowSlowLoadingHint(true, false, false, MAX_AUTO_RETRIES)).toBe(true);
    expect(shouldShowSlowLoadingHint(true, false, true, MAX_AUTO_RETRIES)).toBe(false);
    expect(shouldShowSlowLoadingHint(true, true, false, MAX_AUTO_RETRIES)).toBe(false);
    expect(shouldShowSlowLoadingHint(true, false, false, 0)).toBe(false);
  });

  test('computeIsPending stays true during slow retry before error UI', () => {
    expect(computeIsPending(false, true, false, false)).toBe(true);
    expect(computeIsPending(false, true, false, true)).toBe(false);
    expect(computeIsPending(true, false, false, false)).toBe(true);
  });
});
