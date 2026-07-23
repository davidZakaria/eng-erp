import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Monorepo: trace deps from repo root so vendor chunks resolve correctly.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['next-intl'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'upgrade-insecure-requests',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
