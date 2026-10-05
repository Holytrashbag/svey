<script setup lang="ts">
import SbIcon from './SbIcon.vue'
import type { IconName } from './SbIcon.vue'

defineProps<{
  icon: IconName
  badge?: boolean
}>()
</script>

<template>
  <button
    class="relative w-9 h-9 rounded-lg bg-bg-2 border border-white/6 text-fg-0 flex items-center justify-center cursor-pointer transition-colors duration-[160ms] hover:bg-bg-3"
  >
    <SbIcon :name="icon" :size="18" />
    <span
      v-if="badge"
      class="absolute top-1 right-1 w-[7px] h-[7px] rounded-full bg-crown border-[1.5px] border-bg-2"
    />
  </button>
</template>
