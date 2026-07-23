import { ConfigService } from '@nestjs/config';

const WEAK_SECRETS = new Set([
  'dev-secret',
  'change-me-in-production-use-long-random-string',
]);

export function isProduction(config: ConfigService): boolean {
  return config.get<string>('NODE_ENV') === 'production';
}

export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  const prod = isProduction(config);

  if (prod) {
    if (!secret || secret.length < 32 || WEAK_SECRETS.has(secret)) {
      throw new Error(
        'JWT_SECRET must be set to a random string of at least 32 characters in production',
      );
    }
    return secret;
  }

  return secret ?? 'dev-secret';
}

export function parseTrustProxy(config: ConfigService): number | boolean {
  const raw = config.get<string>('TRUST_PROXY');
  if (raw === 'true') return 1;
  if (raw === 'false' || !raw) return false;
  const hops = Number(raw);
  return Number.isFinite(hops) && hops > 0 ? hops : 1;
}

export function parseCorsOrigins(config: ConfigService): string | string[] {
  const raw = config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}
