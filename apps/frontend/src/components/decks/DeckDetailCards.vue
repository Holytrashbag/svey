<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import ManaCost from './ManaCost.vue'

const { t, te } = useI18n()

function typeLabel(type: string): string {
  const key = `decks.cards.types.${type}`
  return te(key) ? t(key) : type
}

export interface DeckCard {
  type: string
  qty: number
  name: string
  cost: string
  cmc: number
  salt?: boolean
}

const props = defineProps<{ cards: DeckCard[] }>()

const TYPE_ORDER = ['Commander', 'Planeswalker', 'Creature', 'Sorcery', 'Instant', 'Artifact', 'Enchantment', 'Land']

type SortMode = 'type' | 'cmc' | 'name'
const SORT_CYCLE: SortMode[] = ['type', 'cmc', 'name']

const search = ref('')
const sortMode = ref<SortMode>('type')

function nextSort() {
  const i = SORT_CYCLE.indexOf(sortMode.value)
  sortMode.value = SORT_CYCLE[(i + 1) % SORT_CYCLE.length]!
}

const grouped = computed(() => {
  const groups: Record<string, DeckCard[]> = {}
  for (const c of props.cards) {
    if (!groups[c.type]) groups[c.type] = []
    groups[c.type]!.push(c)
  }
  return TYPE_ORDER.filter(t => groups[t]).map(t => ({ type: t, cards: groups[t]! }))
})

const filtered = computed(() => {
  if (!search.value) return grouped.value
  const q = search.value.toLowerCase()
  return grouped.value
    .map(g => ({ ...g, cards: g.cards.filter(c => c.name.toLowerCase().includes(q)) }))
    .filter(g => g.cards.length > 0)
})
</script>

<template>
  <div class="px-5 pb-6">
    <!-- Search + sort row -->
    <div class="flex gap-2 mb-3.5">
      <div class="flex-1 flex items-center gap-2 bg-bg-1 border border-divider rounded-md px-3 h-9.5">
        <SbIcon name="search" :size="14" color="#5A586E" :stroke="2" />
        <input
          v-model="search"
          type="text"
          :placeholder="t('decks.cards.searchPlaceholder')"
          class="flex-1 bg-transparent border-0 outline-none text-fg-0 font-body font-medium text-body-sm"
        />
        <button
          v-if="search"
          class="bg-transparent border-0 cursor-pointer text-fg-2 p-1 flex"
          @click="search = ''"
        >
          <SbIcon name="x" :size="12" :stroke="2.2" />
        </button>
      </div>
      <button
        class="font-body font-bold flex items-center shrink-0 cursor-pointer h-9.5 px-3 rounded-md bg-bg-1 border border-divider text-fg-1 text-caption gap-1.5 whitespace-nowrap"
        @click="nextSort"
      >
        <SbIcon name="chart" :size="13" :stroke="2" />
        <span>{{ t('decks.cards.sort.' + sortMode) }}</span>
      </button>
    </div>

    <!-- Type groups -->
    <div class="flex flex-col gap-4.5">
      <div v-for="g in filtered" :key="g.type">
        <!-- Group header -->
        <div class="flex items-center gap-2 pb-2 mb-2 border-b border-divider">
          <SbIcon v-if="g.type === 'Commander'" name="crown" :size="14" color="#F4B942" :stroke="2" />
          <div
            class="font-display font-bold text-body tracking-[-0.01em]"
            :class="g.type === 'Commander' ? 'text-crown' : 'text-fg-0'"
          >{{ typeLabel(g.type) }}</div>
          <div class="font-mono font-semibold text-[10.5px] text-fg-3">
            {{ g.cards.reduce((s, c) => s + c.qty, 0) }}
          </div>
        </div>

        <!-- Card rows -->
        <div class="flex flex-col">
          <div
            v-for="(card, i) in g.cards"
            :key="i"
            class="flex items-center gap-2.5 py-2.25 px-1 border-b border-divider-soft"
          >
            <!-- Qty badge -->
            <div
              class="font-mono font-bold flex items-center justify-center shrink-0 relative overflow-hidden w-6.5 h-5.5 rounded-md text-[11.5px]"
              :class="g.type === 'Commander' ? 'bg-crown-wash text-crown' : 'bg-bg-2 text-fg-1'"
            >
              {{ card.qty }}
              <div
                v-if="g.type === 'Commander'"
                class="absolute left-0 top-0 bottom-0 w-0.75 bg-crown"
              />
            </div>

            <!-- Name + salt tag -->
            <div class="flex-1 min-w-0 flex items-center gap-1.5">
              <span
                class="font-body truncate text-[13.5px]"
                :class="g.type === 'Commander' ? 'font-bold text-fg-0' : 'font-medium text-[#E4E2F0]'"
              >{{ card.name }}</span>
              <span
                v-if="card.salt"
                class="font-bold shrink-0 text-eyebrow py-px px-1.25 rounded-sm bg-mtg-r/16 text-mtg-r tracking-[0.04em] uppercase"
              >{{ t('decks.cards.salt') }}</span>
            </div>

            <!-- Mana cost -->
            <ManaCost v-if="card.cost" :cost="card.cost" :size="18" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
