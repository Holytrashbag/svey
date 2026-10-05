<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'

const { t } = useI18n()

defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <!-- Backdrop -->
  <div
    class="absolute inset-0 z-30 transition-[background] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :class="open ? 'bg-[rgba(6,7,13,0.62)] pointer-events-auto backdrop-blur-[2px]' : 'bg-transparent pointer-events-none'"
    @click="emit('close')"
  />

  <!-- Sheet panel -->
  <div
    class="absolute left-0 right-0 bottom-0 z-40 bg-bg-1/94 backdrop-blur-[20px] backdrop-saturate-140 rounded-t-3xl border-t border-white/10 shadow-[0_-16px_40px_rgba(0,0,0,0.48)] pt-3 px-5 pb-7 max-h-[82%] flex flex-col box-border transition-transform duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :inert="!open"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- Drag handle -->
    <div class="w-9 h-1 rounded-full bg-overlay-5 mx-auto mb-3.5 shrink-0" />

    <!-- Header row -->
    <div class="flex items-center justify-between mb-3 shrink-0">
      <div class="font-display font-bold text-stat tracking-tight text-fg-0">{{ title }}</div>
      <button
        class="w-7.5 h-7.5 rounded-full bg-divider border-0 text-fg-2 flex items-center justify-center cursor-pointer p-0"
        :aria-label="t('common.close')"
        @click="emit('close')"
      >
        <SbIcon name="x" :size="12" :stroke="2.4" />
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="overflow-y-auto flex-1 min-h-0">
      <slot />
    </div>
  </div>
</template>
