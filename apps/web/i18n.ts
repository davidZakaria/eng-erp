import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, type Locale } from './i18n/config';

export { defaultLocale, locales, type Locale } from './i18n/config';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const resolvedLocale =
    requested && locales.includes(requested as Locale)
      ? (requested as Locale)
      : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default,
  };
});
