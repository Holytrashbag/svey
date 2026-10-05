<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ filter: string }>()

defineEmits<{ add: [] }>()

const { t, te } = useI18n()

const key = computed(() => (te(`decks.empty.${props.filter}.title`) ? props.filter : 'all'))
const title = computed(() => t(`decks.empty.${key.value}.title`))
const sub = computed(() => t(`decks.empty.${key.value}.sub`))
</script>

<template>
  <div class="py-8 px-5 text-center">
    <svg width="96" height="80" viewBox="0 0 96 80" class="mx-auto mb-4">
      <g fill="none" stroke="#3A3A4D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="14" y="22" width="34" height="48" rx="4" transform="rotate(-8 31 46)" />
        <rect x="32" y="14" width="34" height="48" rx="4" />
        <rect x="50" y="22" width="34" height="48" rx="4" transform="rotate(8 67 46)" opacity="0.5" />
      </g>
    </svg>
    <div class="font-display font-bold text-fg-0 text-[17px] tracking-tight">{{ title }}</div>
    <div class="text-body-sm text-fg-2 mx-auto leading-relaxed max-w-60 mt-1.5">{{ sub }}</div>
    <button
      v-if="filter === 'all'"
      class="inline-flex items-center gap-1.5 border-0 font-bold text-body-sm font-body text-white cursor-pointer mt-4.5 py-2.5 px-4.5 bg-arcane rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
      @click="$emit('add')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {{ t('decks.empty.addFirst') }}
    </button>
  </div>
</template>
