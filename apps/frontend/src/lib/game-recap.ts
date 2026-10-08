import { RETIRE_REASON_IDS } from './game-tracker'

const KNOWN: ReadonlySet<string> = new Set(RETIRE_REASON_IDS)

/**
 * i18n label keys for the stored retire reason ids, in stored order. Unknown
 * ids (the API accepts any short string) and duplicates are dropped.
 */
export function retireReasonKeys(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const keys: string[] = []
  for (const id of ids) {
    if (!KNOWN.has(id) || seen.has(id)) continue
    seen.add(id)
    keys.push(`game.endReasons.retire.reasons.${id}.label`)
  }
  return keys
}
