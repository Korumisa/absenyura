const STORAGE_KEY = 'post-login-target';

type LoginFromState = {
  pathname?: string;
  search?: string;
  hash?: string;
};

export function saveTarget(target: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, target);
  } catch {
    // ignore
  }
}

export function getTarget(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearTarget(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getPostLoginTarget(
  from: LoginFromState | undefined,
  user: { role: string }
): string {
  let target =
    from?.pathname && typeof from.pathname === 'string'
      ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
      : undefined;
  if (!target || target === '/dashboard') {
    if (user.role === 'CONTENT_ADMIN') target = '/public-site/profile';
    else target = '/dashboard';
  }
  return target;
}
