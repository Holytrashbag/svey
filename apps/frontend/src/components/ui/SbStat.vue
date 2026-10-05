<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: string | number
  label: string
  suffix?: string
  accent?: 'gold' | 'tide' | 'arcane'
}>()

const accentColorMap: Record<string, string> = {
  gold:   'text-crown',
  tide:   'text-tide-2',
  arcane: 'text-arcane-2',
}

const valueColor = computed(() => (props.accent ? accentColorMap[props.accent] : null) ?? 'text-fg-0')
</script>

<template>
  <div class="flex flex-col gap-1">
    <div
      class="font-display font-bold leading-none tabular-nums text-display tracking-headline"
      :class="valueColor"
    >
      {{ value
      }}<span v-if="suffix" class="text-body text-fg-2 ml-0.5 font-medium">{{ suffix }}</span>
    </div>
    <div class="text-[10px] text-fg-2 font-semibold uppercase tracking-[0.08em]">
      {{ label }}
    </div>
  </div>
</template>
