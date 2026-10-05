<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'

const { t } = useI18n()

defineProps<{
  open: boolean
  title: string
  subtitle?: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <!-- Backdrop -->
  <div
    class="absolute inset-0 z-30 transition-[background,backdrop-filter] duration-260"
    :class="open
      ? 'bg-[rgba(6,7,13,0.66)] backdrop-blur-[3px] pointer-events-auto'
      : 'bg-transparent pointer-events-none'"
    @click="emit('close')"
  />

  <!-- Panel -->
  <div
    class="absolute left-0 right-0 bottom-0 z-40 flex flex-col
           bg-[rgba(14,17,32,0.96)] backdrop-blur-[20px] backdrop-saturate-140
           rounded-t-[24px] border-t border-overlay-3
           shadow-[0_-16px_40px_rgba(0,0,0,0.55)]
           transition-transform duration-260"
    :inert="!open"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
    style="padding: 12px 20px 26px; max-height: 78%;"
  >
    <!-- Drag handle -->
    <div class="w-9 h-1 rounded-full bg-overlay-5 mx-auto mb-3.5 shrink-0" />

    <!-- Header -->
    <div class="shrink-0 mb-3">
      <div class="flex items-center justify-between">
        <div class="font-display font-bold text-[18px] tracking-tight text-fg-0">{{ title }}</div>
        <button
          class="w-7.5 h-7.5 rounded-full bg-overlay-1 border-0 text-fg-2 flex items-center justify-center cursor-pointer p-0"
          :aria-label="t('common.close')"
          @click="emit('close')"
        >
          <SbIcon name="x" :size="12" :stroke="2.4" />
        </button>
      </div>
      <div v-if="subtitle" class="text-caption text-fg-2 mt-1 leading-snug">{{ subtitle }}</div>
    </div>

    <!-- Scrollable body -->
    <div class="overflow-y-auto flex-1 min-h-0">
      <slot />
    </div>
  </div>
</template>
