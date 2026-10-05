<script setup lang="ts">
import { computed } from 'vue'
import type { MtgColor } from './SbPip.vue'

const COLOR_MAP: Record<string, string> = {
  W: '#F3E4B5',
  U: '#4A8FE7',
  B: '#6B5B85',
  R: '#E8654E',
  G: '#4BAE6E',
  C: '#B8B8C8',
}

const props = defineProps<{
  colors: (MtgColor | string)[]
}>()

const background = computed(() => {
  const [only] = props.colors
  if (props.colors.length === 1 && only) {
    return COLOR_MAP[only] ?? only
  }
  const stops: string[] = []
  const step = 100 / props.colors.length
  props.colors.forEach((c, i) => {
    const hex = COLOR_MAP[c] ?? c
    stops.push(`${hex} ${step * i}%`, `${hex} ${step * (i + 1)}%`)
  })
  return `linear-gradient(180deg, ${stops.join(', ')})`
})
</script>

<template>
  <div
    class="shrink-0 w-1 rounded-sm self-stretch"
    :style="{ background }"
  />
</template>
