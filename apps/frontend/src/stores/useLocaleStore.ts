import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SUPPORTED, STORAGE_KEY, detectInitialLocale, type AppLocale } from '@/i18n/detect'
import { setI18nLocale } from '@/i18n'

export type { AppLocale } from '@/i18n/detect'

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<AppLocale>(detectInitialLocale())
  const available = SUPPORTED

  function setLocale(next: AppLocale) {
    locale.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Persistence is best-effort; ignore storage failures (private mode).
    }
    setI18nLocale(next)
  }

  return { locale, available, setLocale }
})
