<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <div
    class="rounded-full border-2 border-arcane border-t-transparent animate-spin shrink-0"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>
