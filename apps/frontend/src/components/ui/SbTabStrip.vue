<script setup lang="ts">
defineProps<{
  tabs: { id: string; label: string }[]
  active: string
}>()

defineEmits<{ change: [id: string] }>()
</script>

<template>
  <div class="flex border-b border-white/6 px-5 gap-6">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="relative bg-transparent border-0 cursor-pointer font-body py-3.5 text-[13.5px] tracking-snug transition-colors duration-160"
      :class="tab.id === active ? 'text-fg-0 font-bold' : 'text-fg-3 font-semibold'"
      @click="$emit('change', tab.id)"
    >
      {{ tab.label }}
      <div
        v-if="tab.id === active"
        class="absolute left-0 right-0 -bottom-px h-0.5 rounded-sm bg-arcane"
      />
    </button>
  </div>
</template>
