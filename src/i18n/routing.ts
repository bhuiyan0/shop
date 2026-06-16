// No URL-based locale routing — the active locale is persisted in a cookie
// (see src/i18n/request.ts) and rendered server-side.
export const locales = ["en", "bn"] as const;
export const defaultLocale: Locale = "en";

export type Locale = (typeof locales)[number];

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
