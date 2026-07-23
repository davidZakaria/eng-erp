const ALLOWED_PREFIXES = [
  '/auth/login',
  '/drawings',
  '/boq',
  '/catalog',
  '/users',
  '/audit-logs',
  '/backups',
  '/mep',
  '/structural',
  '/execution-logs',
  '/execution',
  '/rfi',
  '/defects',
  '/projects',
  '/storage',
  '/reports',
  '/models',
  '/health',
] as const;

export function isAllowedProxyPath(path: string): boolean {
  if (!path.startsWith('/') || path.includes('..')) {
    return false;
  }

  const normalized = path.split('?')[0] ?? path;
  return ALLOWED_PREFIXES.some(
    (prefix) =>
      normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}
