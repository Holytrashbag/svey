<script setup lang="ts">
defineProps<{ level: number }>()
</script>

<template>
  <div class="inline-flex items-center gap-0.5">
    <div
      v-for="i in 5"
      :key="i"
      class="w-2 h-1 rounded-[1px]"
      :class="i <= level ? 'bg-arcane-2' : 'bg-bg-3'"
    />
  </div>
</template>
