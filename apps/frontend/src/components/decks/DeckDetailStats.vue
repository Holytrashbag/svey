<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDeckStore } from '@/stores/useDeckStore'
import type { DeckStatScope } from '@/types/api'

const props = defineProps<{ deckId: string }>()

const store = useDeckStore()
const { t } = useI18n()

onMounted(() => store.fetchDeckStats(props.deckId))

// ── Scope ──────────────────────────────────────────────────────────────────────

type StatsScope = 'mine' | 'general' | 'compare'
const scope = ref<StatsScope>('mine')

const SCOPES: { id: StatsScope }[] = [{ id: 'mine' }, { id: 'general' }, { id: 'compare' }]

// ── Active scope data ──────────────────────────────────────────────────────────

const activeData = computed((): DeckStatScope | null =>
  scope.value === 'mine'
    ? (store.deckStats?.mine ?? null)
    : (store.deckStats?.general ?? null),
)

// ── Stat grid ──────────────────────────────────────────────────────────────────

const STAT_GRID = computed(() => {
  const d = activeData.value
  if (!d) return []
  return [
    {
      label: t('decks.stats.labels.avgPlacement'),
      value: d.avgPlacement != null ? d.avgPlacement.toFixed(1) : '--',
      sub: t('decks.stats.subs.ofFour'),
      accent: '',
    },
    {
      label: t('decks.stats.labels.avgGame'),
      value: d.avgSurvivalMinutes != null ? Math.round(d.avgSurvivalMinutes).toString() : '--',
      sub: t('decks.stats.subs.min'),
      accent: '',
    },
    {
      label: t('decks.stats.labels.funRating'),
      value: d.avgFunRating != null ? d.avgFunRating.toFixed(1) : '--',
      sub: t('decks.stats.subs.outOfFive'),
      accent: 'arcane',
    },
    {
      label: t('decks.stats.labels.eliminated'),
      value: `${d.eliminated}/${d.games}`,
      sub: t('decks.stats.subs.pctOfGames', { pct: Math.round((d.eliminated / d.games) * 100) }),
      accent: '',
    },
  ]
})

// ── Matchups ───────────────────────────────────────────────────────────────────

const activeMatchups = computed(() => activeData.value?.matchups ?? [])

const bestMatchup  = computed(() => activeMatchups.value[0] ?? null)
const worstMatchup = computed(() => {
  const m = activeMatchups.value
  return m.length > 1 ? m[m.length - 1] : null
})

const selectedDeckId = ref<string>('')

watch(activeMatchups, (matchups) => {
  const stillValid = matchups.some(m => m.deckId === selectedDeckId.value)
  if (!stillValid) selectedDeckId.value = matchups[0]?.deckId ?? ''
}, { immediate: true })

const selectedMatchup = computed(() =>
  activeMatchups.value.find(m => m.deckId === selectedDeckId.value) ?? null,
)

const selectedWinrateHex = computed(() => {
  const wr = selectedMatchup.value?.winrate ?? 50
  if (wr >= 55) return '#22c55e'
  if (wr <= 45) return '#ef4444'
  return '#71717a'
})

// ── Compare rows ───────────────────────────────────────────────────────────────

type CompareRow = {
  label:       string
  mVal:        number | null
  gVal:        number | null
  mFmt:        string
  gFmt:        string
  unit:        string
  lowerBetter: boolean
  diffLabel:   string
  better:      boolean | null
}

const compareRows = computed((): CompareRow[] => {
  const mine = store.deckStats?.mine
  const gen  = store.deckStats?.general
  if (!mine || !gen) return []

  function row(
    label: string,
    mVal: number | null,
    gVal: number | null,
    unit: string,
    lowerBetter: boolean,
    decimals = 0,
  ): CompareRow {
    const mFmt = mVal != null ? (decimals ? mVal.toFixed(decimals) : String(Math.round(mVal))) : '--'
    const gFmt = gVal != null ? (decimals ? gVal.toFixed(decimals) : String(Math.round(gVal))) : '--'
    if (mVal == null || gVal == null) {
      return { label, mVal, gVal, mFmt, gFmt, unit, lowerBetter, diffLabel: '--', better: null }
    }
    const diff   = mVal - gVal
    const better = lowerBetter ? diff < 0 : diff > 0
    const sign   = diff > 0 ? '+' : ''
    const fmtD   = decimals ? diff.toFixed(decimals) : String(Math.round(diff))
    return { label, mVal, gVal, mFmt, gFmt, unit, lowerBetter, diffLabel: `${sign}${fmtD}${unit}`, better }
  }

  return [
    row(t('decks.stats.labels.winrate'),      mine.winrate,            gen.winrate,            '%',                                false),
    row(t('decks.stats.labels.avgPlacement'), mine.avgPlacement,        gen.avgPlacement,        '',                                 true,  1),
    row(t('decks.stats.labels.avgGame'),      mine.avgSurvivalMinutes,  gen.avgSurvivalMinutes,  ' ' + t('decks.stats.subs.min'),    false),
    row(t('decks.stats.labels.funRating'),    mine.avgFunRating,        gen.avgFunRating,        '',                                 false, 1),
  ]
})

function accentColorClass(accent: string) {
  return accent === 'arcane' ? 'text-arcane-2' : accent === 'danger' ? 'text-danger' : 'text-fg-0'
}
</script>

<template>
  <div>
    <!-- Scope segmented control -->
    <div class="px-5 pb-4">
      <div class="flex p-1 bg-bg-1 border border-divider rounded-md">
        <button
          v-for="s in SCOPES"
          :key="s.id"
          class="flex-1 font-body font-bold cursor-pointer border-0 py-2 rounded-[7px] text-[12.5px] transition-all duration-160 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          :class="scope === s.id ? 'bg-bg-3 text-fg-0' : 'bg-transparent text-fg-2'"
          @click="scope = s.id"
        >{{ t('decks.stats.scopes.' + s.id) }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.statsLoading" class="px-5 pb-6 flex items-center justify-center h-48 text-fg-3 text-body-sm">
      {{ t('decks.stats.loading') }}
    </div>

    <!-- Error -->
    <div v-else-if="store.statsError" class="px-5 pb-6 flex items-center justify-center h-48 text-danger text-body-sm text-center">
      {{ store.statsError }}
    </div>

    <!-- Stats content -->
    <div v-else class="px-5 pb-6">

      <!-- Compare view -->
      <template v-if="scope === 'compare'">
        <div class="text-[12.5px] text-fg-2 leading-[1.55] mb-3.5">
          {{ t('decks.stats.compareIntro') }}
        </div>

        <!-- No data -->
        <div v-if="compareRows.length === 0" class="py-8 text-center text-fg-3 text-body-sm">
          {{ t('decks.stats.notEnoughCompare') }}
        </div>

        <template v-else>
          <!-- Header row -->
          <div class="grid grid-cols-[1fr_80px_80px] pb-2 items-center border-b border-divider">
            <div />
            <div class="text-right">
              <span class="font-bold text-[10px] text-arcane-2 tracking-[0.08em] uppercase">{{ t('decks.stats.you') }}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-[10px] text-tide-2 tracking-[0.08em] uppercase">{{ t('decks.stats.average') }}</span>
            </div>
          </div>

          <!-- Data rows -->
          <div
            v-for="r in compareRows"
            :key="r.label"
            class="grid grid-cols-[1fr_80px_80px] py-3.5 items-center border-b border-divider-soft"
          >
            <div>
              <div class="font-semibold text-body-sm text-fg-0">{{ r.label }}</div>
              <div
                class="font-mono font-semibold text-meta mt-0.75"
                :class="r.better == null ? 'text-fg-2' : r.better ? 'text-crown' : 'text-fg-2'"
              >
                {{ r.diffLabel }}
                <template v-if="r.better != null">&middot; {{ r.better ? t('decks.stats.better') : t('decks.stats.behind') }}</template>
              </div>
            </div>
            <div class="text-right">
              <span class="font-display font-bold text-stat tracking-tight text-arcane-2 tabular-nums">
                {{ r.mFmt }}{{ r.better != null ? r.unit : '' }}
              </span>
            </div>
            <div class="text-right">
              <span class="font-display font-bold text-stat tracking-tight text-tide-2 tabular-nums">
                {{ r.gFmt }}{{ r.better != null ? r.unit : '' }}
              </span>
            </div>
          </div>
        </template>
      </template>

      <!-- Mine / General view -->
      <template v-else>
        <div class="text-[12.5px] text-fg-2 leading-[1.55] mb-3.5">
          <template v-if="scope === 'mine'">
            {{ t('decks.stats.mineIntro') }}
          </template>
          <template v-else>
            {{ t('decks.stats.generalIntro') }}
          </template>
        </div>

        <!-- No data state -->
        <div v-if="!activeData" class="py-8 text-center text-fg-3 text-body-sm">
          <template v-if="scope === 'mine'">
            {{ t('decks.stats.mineNoData') }}
          </template>
          <template v-else>
            {{ t('decks.stats.generalNoData') }}
          </template>
        </div>

        <template v-else>
          <!-- Big record block -->
          <div class="py-4.5 px-4 bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(20,184,166,0.10)_70%,transparent)] border border-arcane/22 rounded-[14px] grid grid-cols-3 gap-1 mb-3.5">
            <div class="flex flex-col items-center gap-1.5">
              <div class="text-stat-value-xl">{{ activeData.wins }}&ndash;{{ activeData.losses }}</div>
              <div class="font-semibold text-[10px] text-fg-2 tracking-[0.08em] uppercase">{{ t('decks.stats.record') }}</div>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <div class="font-display font-bold text-display tracking-headline tabular-nums leading-none text-crown">{{ activeData.winrate }}%</div>
              <div class="font-semibold text-[10px] text-fg-2 tracking-[0.08em] uppercase">{{ t('decks.stats.winrate') }}</div>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <div class="text-stat-value-xl">{{ activeData.games }}</div>
              <div class="font-semibold text-[10px] text-fg-2 tracking-[0.08em] uppercase">{{ t('decks.stats.games') }}</div>
            </div>
          </div>

          <!-- Stat grid -->
          <div class="grid grid-cols-2 gap-2.5 mb-3.5">
            <div
              v-for="stat in STAT_GRID"
              :key="stat.label"
              class="p-3.5 card-surface flex flex-col gap-1.5"
            >
              <div class="text-eyebrow-label">{{ stat.label }}</div>
              <div
                class="font-display font-bold text-[24px] tracking-headline leading-none tabular-nums"
                :class="accentColorClass(stat.accent)"
              >{{ stat.value }}</div>
              <div v-if="stat.sub" class="font-mono font-medium text-meta text-fg-2">{{ stat.sub }}</div>
            </div>
          </div>

          <!-- Best / Worst matchup cards -->
          <div v-if="bestMatchup || worstMatchup" class="grid grid-cols-2 gap-2.5 mb-2.5">
            <div v-if="bestMatchup" class="p-3.5 card-surface flex flex-col gap-1.5">
              <div class="text-eyebrow-label">{{ t('decks.stats.bestMatchup') }}</div>
              <div class="font-display font-bold text-[24px] tracking-headline leading-none tabular-nums" style="color: #22c55e">
                {{ bestMatchup.winrate }}%
              </div>
              <div class="font-mono font-medium text-meta text-fg-2 truncate">{{ bestMatchup.commander ?? t('decks.stats.unknown') }}</div>
            </div>
            <div v-if="worstMatchup" class="p-3.5 card-surface flex flex-col gap-1.5">
              <div class="text-eyebrow-label">{{ t('decks.stats.toughestMatchup') }}</div>
              <div class="font-display font-bold text-[24px] tracking-headline leading-none tabular-nums text-danger">
                {{ worstMatchup.winrate }}%
              </div>
              <div class="font-mono font-medium text-meta text-fg-2 truncate">{{ worstMatchup.commander ?? t('decks.stats.unknown') }}</div>
            </div>
          </div>

          <!-- Deck matchup lookup -->
          <div v-if="activeMatchups.length > 0" class="p-3.5 card-surface mb-3.5">
            <div class="text-eyebrow-label mb-2.5">{{ t('decks.stats.winrateVsDeck') }}</div>
            <div class="relative mb-3">
              <select
                v-model="selectedDeckId"
                class="w-full bg-bg-2 border border-divider rounded-lg px-3 py-2.5 text-fg-0 text-body-sm font-semibold font-body appearance-none cursor-pointer pr-8"
              >
                <option v-for="m in activeMatchups" :key="m.deckId" :value="m.deckId">
                  {{ m.commander ?? m.deckId }}
                </option>
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div v-if="selectedMatchup" class="flex items-baseline gap-2 mb-2">
              <div
                class="font-display font-bold text-display tracking-headline tabular-nums leading-none transition-colors duration-200"
                :style="{ color: selectedWinrateHex }"
              >{{ selectedMatchup.winrate }}%</div>
              <div class="font-mono font-semibold text-meta text-fg-2">{{ t('decks.stats.winRate') }}</div>
              <div class="font-mono font-semibold text-meta text-fg-3 ml-auto">{{ t('decks.stats.gamesCount', selectedMatchup.games) }}</div>
            </div>
            <div v-if="selectedMatchup" class="h-1 rounded-full bg-bg-2 relative overflow-hidden mb-1.5">
              <div
                class="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                :style="{ width: selectedMatchup.winrate + '%', background: selectedWinrateHex }"
              ></div>
              <div class="absolute top-0 left-1/2 h-full w-px bg-divider-strong"></div>
            </div>
            <div v-if="selectedMatchup" class="font-mono font-medium text-meta text-fg-3">
              {{ selectedMatchup.winrate >= 55 ? t('decks.stats.matchupFavorable') : selectedMatchup.winrate <= 45 ? t('decks.stats.matchupUnfavorable') : t('decks.stats.matchupEven') }}
            </div>
          </div>

          <!-- Last 12 games strip -->
          <div v-if="activeData.recentResults.length > 0" class="p-3.5 card-surface">
            <div class="flex justify-between items-baseline mb-2.5">
              <div class="text-eyebrow-label">{{ t('decks.stats.lastGames', { n: activeData.recentResults.length }) }}</div>
              <div class="font-mono font-semibold text-meta text-fg-2">
                {{ activeData.recentResults.filter(r => r === 'W').length }}W &middot; {{ activeData.recentResults.filter(r => r === 'L').length }}L
              </div>
            </div>
            <div class="flex gap-1">
              <div
                v-for="(r, i) in activeData.recentResults"
                :key="i"
                class="font-display font-bold flex items-center justify-center flex-1 h-7 rounded-sm text-[10px]"
                :class="r === 'W' ? 'bg-crown text-bg-0' : 'bg-danger/30 text-danger'"
              >{{ r }}</div>
            </div>
          </div>
        </template>
      </template>

    </div>
  </div>
</template>
