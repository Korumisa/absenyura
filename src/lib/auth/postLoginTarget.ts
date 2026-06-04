type LoginFromState = {
  pathname?: string;
  search?: string;
  hash?: string;
};

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
