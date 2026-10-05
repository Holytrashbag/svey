import type { AppLocale } from './detect'

type LocaleDateFormats = Record<string, Intl.DateTimeFormatOptions>
type LocaleNumberFormats = Record<string, Intl.NumberFormatOptions>

// Named date formats referenced via `d(date, 'medium')` etc.
export const datetimeFormats = {
  en: {
    founded: { month: 'short', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
  },
  de: {
    founded: { month: 'short', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
  },
} satisfies Record<AppLocale, LocaleDateFormats>

// Named number formats referenced via `n(value, 'percent')` etc.
export const numberFormats = {
  en: {
    percent: { style: 'percent', maximumFractionDigits: 0 },
    decimal: { style: 'decimal' },
  },
  de: {
    percent: { style: 'percent', maximumFractionDigits: 0 },
    decimal: { style: 'decimal' },
  },
} satisfies Record<AppLocale, LocaleNumberFormats>
