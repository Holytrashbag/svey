<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

export interface DeckAboutData {
  format: string
  archetype?: string
  totalCards: number
  estCost?: number
  saltSum: number
  ownerHandle?: string
  age: string
  source: string
  sourceUrl: string
}

defineProps<{ deck: DeckAboutData }>()
defineEmits<{ archive: [] }>()
</script>

<template>
  <div class="px-5 pb-6 flex flex-col gap-2.5">

    <!-- About rows -->
    <template v-for="row in [
      { label: t('decks.about.format'),     value: deck.format,             accent: '' },
      { label: t('decks.about.cardCount'),  value: String(deck.totalCards), accent: '' },
    ]" :key="row.label">
      <div class="card-surface py-3 px-3.5">
        <div class="text-meta text-fg-2 font-semibold">{{ row.label }}</div>
        <div class="font-body font-bold truncate mt-1 text-body text-fg-0">{{ row.value }}</div>
      </div>
    </template>

    <div v-if="deck.archetype" class="card-surface py-3 px-3.5">
      <div class="text-meta text-fg-2 font-semibold">{{ t('decks.about.archetype') }}</div>
      <div class="font-body font-bold truncate mt-1 text-body text-fg-0">{{ deck.archetype }}</div>
    </div>

    <div v-if="deck.estCost !== undefined" class="card-surface py-3 px-3.5">
      <div class="text-meta text-fg-2 font-semibold">{{ t('decks.about.estValue') }}</div>
      <div class="font-body font-bold truncate mt-1 text-body text-crown">${{ deck.estCost.toFixed(2) }}</div>
    </div>

    <!-- Salt sum with sub-label -->
    <div class="card-surface py-3 px-3.5">
      <div class="text-meta text-fg-2 font-semibold">{{ t('decks.about.saltSum') }}</div>
      <div class="font-body font-bold mt-1 text-body text-danger">
        {{ deck.saltSum.toFixed(1) }}
      </div>
      <div class="font-mono text-meta text-fg-3 mt-0.5">
        {{ t('decks.about.saltSub') }}
      </div>
    </div>

    <!-- Owner -->
    <div v-if="deck.ownerHandle" class="card-surface py-3 px-3.5">
      <div class="text-meta text-fg-2 font-semibold">{{ t('decks.about.owner') }}</div>
      <div class="font-body font-bold truncate mt-1 text-body text-fg-0">
        @{{ deck.ownerHandle }}
      </div>
    </div>

    <!-- Created -->
    <div class="card-surface py-3 px-3.5">
      <div class="text-meta text-fg-2 font-semibold">{{ t('decks.about.created') }}</div>
      <div class="font-body font-bold truncate mt-1 text-body text-fg-0">
        {{ deck.age }}
      </div>
    </div>

    <!-- Source with action -->
    <div class="flex items-center gap-3 card-surface py-3 px-3.5">
      <div class="flex-1 min-w-0">
        <div class="text-meta text-fg-2 font-semibold">{{ t('decks.about.source') }}</div>
        <div class="font-body font-bold truncate mt-1 text-body text-fg-0">
          {{ deck.source }}
        </div>
        <div v-if="deck.sourceUrl" class="font-mono truncate text-meta text-fg-3 mt-0.5">
          {{ deck.sourceUrl }}
        </div>
      </div>
      <a
        v-if="deck.sourceUrl"
        :href="deck.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="font-body font-bold shrink-0 cursor-pointer py-1.5 px-2.5 rounded-md bg-transparent text-arcane-2 border border-arcane-edge text-[11.5px] no-underline"
      >{{ t('decks.about.open') }}</a>
    </div>

    <!-- Attribution (Scryfall / Wizards of the Coast) -->
    <p class="text-meta text-fg-3 leading-relaxed px-1 mt-0.5">
      {{ t('decks.about.attribution') }}
    </p>

    <!-- Danger zone -->
    <div class="mt-1.5 p-3.5 card-surface">
      <div class="text-eyebrow-label">{{ t('decks.about.dangerZone') }}</div>
      <button
        class="font-body font-bold cursor-pointer border-0 mt-2.5 py-2.25 px-3.5 rounded-[9px] bg-danger/14 text-danger text-[12.5px]"
        @click="$emit('archive')"
      >{{ t('decks.about.archive') }}</button>
    </div>

  </div>
</template>
