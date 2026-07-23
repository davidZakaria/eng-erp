'use client';

import { useLocale } from 'next-intl';
import { locales } from '@/i18n/config';
import { usePathname, useRouter } from '@/navigation';

function stripLocalePrefix(pathname: string): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || '/';
    }
  }
  return pathname || '/';
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(nextLocale: 'en' | 'ar') {
    if (nextLocale === locale) return;
    const path = stripLocalePrefix(pathname);
    router.replace(path, { locale: nextLocale });
  }

  return (
    <div className="inline-flex rounded border border-[var(--border)] overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => switchLocale('en')}
        className={`px-2.5 py-1.5 transition ${
          locale === 'en'
            ? 'bg-[var(--accent)] text-white font-semibold'
            : 'text-[var(--text)] hover:bg-[var(--surface-elevated)]'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchLocale('ar')}
        className={`px-2.5 py-1.5 transition ${
          locale === 'ar'
            ? 'bg-[var(--accent)] text-white font-semibold'
            : 'text-[var(--text)] hover:bg-[var(--surface-elevated)]'
        }`}
      >
        AR
      </button>
    </div>
  );
}
