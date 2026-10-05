<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const LEVELS = [
  { n: 1, name: 'Exhibition' },
  { n: 2, name: 'Core' },
  { n: 3, name: 'Upgraded' },
  { n: 4, name: 'Optimized' },
  { n: 5, name: 'cEDH' },
]

const props = defineProps<{
  estimated: number
  value: number
  override: boolean
}>()

const emit = defineEmits<{
  change: [n: number]
  toggleOverride: []
}>()

const active = computed(() => props.override ? props.value : props.estimated)
const currentLevel = computed(() => LEVELS.find(l => l.n === active.value))
const estimatedLevel = computed(() => LEVELS.find(l => l.n === props.estimated))
</script>

<template>
  <div class="mx-5 mb-4 p-3.5 bg-bg-1 border border-divider rounded-lg">
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div>
        <div class="font-bold text-[10px] text-fg-3 tracking-eyebrow uppercase">{{ t('decks.bracket.title') }}</div>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="font-display font-bold text-display-sm tracking-tight text-arcane-2 leading-none">{{ currentLevel?.n }} &middot; {{ currentLevel?.name }}</span>
          <span
            v-if="override"
            class="font-bold text-[10px] py-0.5 px-1.75 rounded-md bg-crown/16 text-crown tracking-[0.04em] uppercase"
          >{{ t('decks.bracket.override') }}</span>
        </div>
        <div class="text-[11.5px] text-fg-2 mt-1.25">
          <template v-if="override">
            {{ t('decks.bracket.estimates') }}
            <span class="text-fg-1 font-semibold">{{ estimated }} &middot; {{ estimatedLevel?.name }}</span>
          </template>
          <template v-else>
            {{ t('decks.bracket.estimatedHint') }}
          </template>
        </div>
      </div>

      <button
        class="font-body font-bold shrink-0 cursor-pointer py-1.5 px-2.5 rounded-md text-[11.5px]"
        :class="override
          ? 'bg-crown/16 text-crown border-0'
          : 'bg-transparent text-fg-2 border border-overlay-3'"
        @click="emit('toggleOverride')"
      >{{ override ? t('decks.bracket.auto') : t('decks.bracket.override') }}</button>
    </div>

    <!-- 5-segment selector -->
    <div class="flex gap-1.5">
      <button
        v-for="l in LEVELS"
        :key="l.n"
        class="font-display font-bold relative flex-1 py-2.5 pb-2.25 rounded-md border text-body transition-all duration-160 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        :class="[
          l.n === active
            ? 'bg-[linear-gradient(180deg,rgba(139,92,246,0.30),rgba(139,92,246,0.18))] border-arcane-edge text-fg-0'
            : 'bg-bg-2 border-divider text-fg-2',
          override ? 'cursor-pointer' : 'cursor-default',
          !override && l.n !== active ? 'opacity-60' : 'opacity-100',
        ]"
        :disabled="!override"
        @click="override && emit('change', l.n)"
      >
        {{ l.n }}
        <!-- Dot showing the estimated bracket when override is active -->
        <div
          v-if="override && l.n === estimated"
          class="absolute top-0.75 right-1 w-1.25 h-1.25 rounded-full bg-crown"
        />
      </button>
    </div>

    <div class="flex justify-between font-mono mt-2 text-meta text-fg-3">
      <span>Casual</span>
      <span>cEDH</span>
    </div>
  </div>
</template>
