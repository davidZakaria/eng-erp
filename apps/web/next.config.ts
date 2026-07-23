import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // Monorepo: trace deps from repo root so vendor chunks resolve correctly.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['next-intl'],
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3001'}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
