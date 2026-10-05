<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ManaPip from './ManaPip.vue'
import { apiUrl } from '@/lib/api'
import { useCardStore, type CardRef } from '@/stores/useCardStore'
import type { MtgColor } from '@/components/ui/SbPip.vue'

const { t } = useI18n()

const MTG_BG: Record<string, string> = {
  W: '#F3E4B5', U: '#4A8FE7', B: '#6B5B85', R: '#E8654E', G: '#4BAE6E',
}

export type DeckCommander = { name: string; scryfallId: string }

export interface DeckHeroData {
  name: string
  commanders: DeckCommander[]
  colors: MtgColor[]
  format: string
  archetype?: string
  wins: number
  losses: number
  totalCards: number
  estCost?: number
  saltSum: number
}

const props = defineProps<{ deck: DeckHeroData }>()

const cardStore = useCardStore()

function refOf(c: DeckCommander): CardRef {
  return c.scryfallId ? { oracleId: c.scryfallId } : { name: c.name }
}

// Routed through our own API so the browser never contacts Scryfall directly.
// `scryfallId` actually holds Scryfall's oracle_id (from Archidekt), so it goes
// to the `oracleId` param; name is the fallback when no id is available.
function artUrl(c: DeckCommander): string {
  const ref = c.scryfallId
    ? `oracleId=${encodeURIComponent(c.scryfallId)}`
    : `name=${encodeURIComponent(c.name)}`
  return apiUrl(`/cards/art?${ref}&version=art_crop`)
}

// Scryfall requires the illustrator be identifiable wherever the art_crop shows.
watch(
  () => props.deck.commanders,
  (cmds) => cmds.forEach((c) => void cardStore.fetchArtist(refOf(c))),
  { immediate: true },
)

const artistCredit = computed(() => {
  const names = props.deck.commanders
    .map((c) => cardStore.artistFor(refOf(c)))
    .filter((a): a is string => !!a)
  if (!names.length) return ''
  return t('decks.hero.illus', { names: [...new Set(names)].join(' · ') })
})

const commanderLabel = computed(() =>
  props.deck.commanders.map(c => c.name).join(' // ')
)

const colorStripStyle = computed(() => {
  const c = props.deck.colors
  const [only] = c
  if (c.length === 1 && only) return { background: MTG_BG[only] ?? '#B8B8C8' }
  const step = 100 / c.length
  const stops = c.flatMap((col, i) => [
    `${MTG_BG[col]} ${step * i}%`,
    `${MTG_BG[col]} ${step * (i + 1)}%`,
  ])
  return { background: `linear-gradient(90deg, ${stops.join(', ')})` }
})

const winrate = computed(() => {
  const t = props.deck.wins + props.deck.losses
  return t > 0 ? Math.round((props.deck.wins / t) * 100) : 0
})
</script>

<template>
  <div class="relative">
    <!-- Art zone -->
    <div class="relative overflow-hidden h-55 bg-[#0c0f24]">
      <!-- Two commanders (partners) — diagonal split -->
      <template v-if="deck.commanders.length >= 2">
        <img
          :src="artUrl(deck.commanders[0]!)"
          class="absolute inset-0 w-full h-full object-cover"
          style="clip-path: polygon(0 0, 55% 0, 45% 100%, 0 100%); object-position: 25% center"
          alt=""
        />
        <img
          :src="artUrl(deck.commanders[1]!)"
          class="absolute inset-0 w-full h-full object-cover"
          style="clip-path: polygon(55% 0, 100% 0, 100% 100%, 45% 100%); object-position: 75% center"
          alt=""
        />
      </template>
      <!-- Single commander -->
      <img
        v-else-if="deck.commanders.length === 1"
        :src="artUrl(deck.commanders[0]!)"
        class="absolute inset-0 w-full h-full object-cover object-center"
        alt=""
      />
      <!-- Fallback placeholder -->
      <template v-else>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_30%,rgba(75,174,110,0.32),transparent_70%),radial-gradient(ellipse_70%_55%_at_80%_70%,rgba(139,92,246,0.30),transparent_70%),radial-gradient(ellipse_60%_50%_at_50%_90%,rgba(74,143,231,0.22),transparent_70%),linear-gradient(180deg,#1b1840_0%,#0c0f24_100%)]" />
        <svg viewBox="0 0 390 220" class="absolute inset-0 w-full h-full" fill="none">
          <g opacity="0.12" stroke="#F5F4FB" stroke-width="1">
            <rect x="40" y="36" width="120" height="170" rx="10" transform="rotate(-6 100 121)" />
            <rect x="135" y="20" width="120" height="180" rx="10" />
            <rect x="240" y="36" width="120" height="170" rx="10" transform="rotate(6 300 121)" />
          </g>
          <circle cx="195" cy="110" r="38" fill="#F5F4FB" opacity="0.08" />
        </svg>
      </template>
      <!-- Bottom scrim -->
      <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,7,13,0)_0%,rgba(6,7,13,0.45)_55%,rgba(6,7,13,0.95)_100%)]" />

      <!-- Illustrator credit (required by Scryfall when using art_crop) -->
      <div
        v-if="artistCredit"
        class="absolute bottom-1 right-2.5 text-eyebrow font-medium tracking-wide text-white/45 pointer-events-none"
      >{{ artistCredit }}</div>
    </div>

    <!-- Color identity strip -->
    <div class="w-full h-0.75" :style="colorStripStyle" />

    <!-- Title block -->
    <div class="pt-3.5 pb-3.5 px-5">
      <!-- Meta: pips · format · archetype -->
      <div class="flex items-center flex-wrap gap-1.5 mb-1.5">
        <ManaPip v-for="c in deck.colors" :key="c" :sym="c" :size="20" />
        <span class="text-fg-4">·</span>
        <span class="font-bold text-meta text-fg-2 tracking-wide uppercase">{{ deck.format }}</span>
        <template v-if="deck.archetype">
          <span class="text-fg-4">·</span>
          <span class="text-caption text-fg-2">{{ deck.archetype }}</span>
        </template>
      </div>

      <!-- Deck name -->
      <h1 class="font-display font-bold text-fg-0 m-0 text-display tracking-headline leading-[1.05]">{{ deck.name }}</h1>

      <!-- Commander name -->
      <div v-if="commanderLabel" class="italic mt-1 text-[13.5px] text-fg-1">
        {{ commanderLabel }}
      </div>

      <!-- Stats row -->
      <div class="flex items-center flex-wrap mt-3.5 gap-3.5">
        <!-- Record -->
        <div>
          <div class="font-bold text-eyebrow text-fg-3 tracking-eyebrow uppercase">{{ t('decks.hero.record') }}</div>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="font-display font-bold text-stat tracking-tight text-crown tabular-nums leading-none">{{ deck.wins }}&ndash;{{ deck.losses }}</span>
            <span class="font-mono font-semibold text-[10.5px] text-fg-2">{{ winrate }}%</span>
          </div>
        </div>

        <div class="divider-vertical h-5.5 bg-overlay-1" />

        <!-- Size -->
        <div>
          <div class="font-bold text-eyebrow text-fg-3 tracking-eyebrow uppercase">{{ t('decks.hero.size') }}</div>
          <div class="mt-1">
            <span class="font-display font-bold text-fg-0 text-stat tracking-tight tabular-nums leading-none">{{ deck.totalCards }}</span>
          </div>
        </div>

        <template v-if="deck.estCost !== undefined">
          <div class="divider-vertical h-5.5 bg-overlay-1" />

          <!-- Est. cost -->
          <div>
            <div class="font-bold text-eyebrow text-fg-3 tracking-eyebrow uppercase">{{ t('decks.hero.estCost') }}</div>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="font-display font-bold text-fg-0 text-stat tracking-tight tabular-nums leading-none">${{ Math.round(deck.estCost) }}</span>
              <span class="font-mono font-semibold text-[10.5px] text-fg-2">{{ t('decks.hero.usd') }}</span>
            </div>
          </div>
        </template>

        <div class="divider-vertical h-5.5 bg-overlay-1" />

        <!-- Salt sum -->
        <div>
          <div class="font-bold text-eyebrow text-fg-3 tracking-eyebrow uppercase">{{ t('decks.hero.saltSum') }}</div>
          <div class="mt-1">
            <span
              class="font-display font-bold text-stat tracking-tight tabular-nums leading-none"
              :class="deck.saltSum > 15 ? 'text-mtg-r' : 'text-fg-0'"
            >{{ deck.saltSum.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
