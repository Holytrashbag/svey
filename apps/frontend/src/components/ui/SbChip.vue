<script setup lang="ts">
const props = defineProps<{
  active?: boolean
}>()
</script>

<template>
  <button
    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-body-sm font-semibold cursor-pointer transition-all duration-160"
    :class="props.active
      ? 'bg-arcane text-white border border-arcane'
      : 'bg-transparent text-fg-1 border border-white/12 hover:border-white/20'"
  >
    <slot />
  </button>
</template>
