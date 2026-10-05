<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  wins: number
  losses: number
}>()

const pct = computed(() => {
  const total = props.wins + props.losses
  return total > 0 ? Math.round((props.wins / total) * 100) : 0
})
</script>

<template>
  <div class="flex items-center gap-2.5">
    <div class="flex-1 h-1 rounded bg-bg-2 overflow-hidden relative">
      <div
        class="absolute inset-y-0 left-0 rounded bg-crown"
        :style="{ width: `${pct}%` }"
      />
    </div>
    <div class="font-mono text-meta text-fg-2 whitespace-nowrap">
      <span class="text-crown font-semibold">{{ wins }}W</span
      ><span class="text-fg-4 mx-0.75">–</span
      ><span>{{ losses }}L</span
      ><span class="text-fg-4 mx-1.5">·</span
      ><span class="text-fg-1">{{ pct }}%</span>
    </div>
  </div>
</template>
