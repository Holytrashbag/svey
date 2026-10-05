// Supported UI locales. Add a new code here (and a matching folder under
// locales/) to make another language available app-wide.
export const SUPPORTED = ['en', 'de'] as const
export type AppLocale = (typeof SUPPORTED)[number]

// English is the default and the fallback for any missing key.
export const DEFAULT_LOCALE: AppLocale = 'en'

export const STORAGE_KEY = 'svey.locale'

export function isSupported(value: string | null | undefined): value is AppLocale {
  return value != null && (SUPPORTED as readonly string[]).includes(value)
}

/**
 * Resolve the locale to start in:
 *   1. the user's previously persisted choice (localStorage),
 *   2. the browser's preferred languages (primary subtag, e.g. `de-DE` -> `de`),
 *   3. the default locale.
 */
export function detectInitialLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isSupported(stored)) return stored
  } catch {
    // localStorage may be unavailable (private mode) — fall through to detection.
  }

  const candidates =
    typeof navigator !== 'undefined' ? [navigator.language, ...(navigator.languages ?? [])] : []
  for (const tag of candidates) {
    const primary = tag?.split('-')[0]?.toLowerCase()
    if (isSupported(primary)) return primary
  }

  return DEFAULT_LOCALE
}
