<script setup lang="ts">
import { computed } from 'vue'
import ManaPip from './ManaPip.vue'

const props = withDefaults(defineProps<{
  cost: string
  size?: number
}>(), { size: 18 })

// Cost arrives with braces stripped, e.g. "3WW" or split "3W/WW".
// Hybrid/phyrexian pairs (W/U, 2/W, W/P) are single pip tokens.
// Any remaining "/" is a split-card separator rendered as text.
const tokens = computed(() =>
  Array.from(
    props.cost.matchAll(/\d+|[WUBRG]\/[WUBRG]|2\/[WUBRG]|[WUBRG]\/P|[A-Z]|\//g),
    m => m[0],
  )
)
</script>

<template>
  <div class="inline-flex items-center gap-0.5">
    <template v-for="(t, k) in tokens" :key="k">
      <span v-if="t === '/'" class="text-fg-3 font-bold self-center" :style="{ fontSize: `${size * 0.7}px` }">/</span>
      <ManaPip v-else :sym="t" :size="size" />
    </template>
  </div>
</template>
