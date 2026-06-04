import { describe, expect, test } from 'vitest';
import { getPostLoginTarget } from './postLoginTarget';

describe('getPostLoginTarget', () => {
  test('preserves pathname, search, and hash from login redirect state', () => {
    expect(
      getPostLoginTarget(
        { pathname: '/attend', search: '?session=abc', hash: '#step2' },
        { role: 'MEMBER' }
      )
    ).toBe('/attend?session=abc#step2');
  });

  test('defaults content admin to profile CMS', () => {
    expect(getPostLoginTarget(undefined, { role: 'CONTENT_ADMIN' })).toBe('/public-site/profile');
  });

  test('defaults other roles to dashboard when no from state', () => {
    expect(getPostLoginTarget(undefined, { role: 'MEMBER' })).toBe('/dashboard');
  });
});
