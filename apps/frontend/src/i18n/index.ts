import { createI18n } from 'vue-i18n'
import { messages } from './messages'
import { datetimeFormats, numberFormats } from './formats'
import { DEFAULT_LOCALE, detectInitialLocale, type AppLocale } from './detect'

const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  datetimeFormats,
  numberFormats,
})

// Keep <html lang> in sync with the initial locale for a11y / SEO.
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.global.locale.value
}

/** Switch the active UI locale and update <html lang>. */
export function setI18nLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export default i18n
