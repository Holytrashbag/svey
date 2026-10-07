<script setup lang="ts">
import type { GsDeck } from '@/lib/game-setup'

defineProps<{
  deck: GsDeck
  selected: boolean
  borrowed: boolean
}>()

defineEmits<{ pick: [] }>()
</script>

<template>
  <button type="button" />
</template>
