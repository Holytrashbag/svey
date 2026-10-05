<script setup lang="ts">
import { computed } from 'vue'

export type MtgColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'

const props = withDefaults(defineProps<{
  color: MtgColor | string
  size?: number
}>(), { size: 14 })

const COLOR_MAP: Record<string, string> = {
  W: '#F3E4B5',
  U: '#4A8FE7',
  B: '#6B5B85',
  R: '#E8654E',
  G: '#4BAE6E',
  C: '#B8B8C8',
}

const bg = computed(() => COLOR_MAP[props.color] ?? props.color)
</script>

<template>
  <div
    class="rounded-full border border-black/30 shrink-0"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: bg,
    }"
  />
</template>