import { useI18n } from "vue-i18n"
import { relativeTimeToken } from "@/lib/time"

/**
 * Locale-aware formatting helpers. The returned functions read the active
 * locale through vue-i18n, so any computed/template that calls them re-renders
 * when the language changes.
 */
export function useFormat() {
  const { t, d } = useI18n()

  /** Compact relative time, e.g. "5 min ago" / "vor 5 Min." */
  function relative(iso: string | null): string {
    const token = relativeTimeToken(iso)
    return "n" in token ? t(token.key, { n: token.n }) : t(token.key)
  }

  /** Absolute date, e.g. "Jun 19, 2026" / "19. Juni 2026". */
  function date(iso: string): string {
    return d(new Date(iso), "medium")
  }

  /** Month + year, e.g. "Jun 2026" / "Juni 2026". */
  function founded(iso: string): string {
    return d(new Date(iso), "founded")
  }

  return { relative, date, founded }
}
