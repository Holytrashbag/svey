<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'

const { t } = useI18n()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()

function goToImport() {
  emit('close')
  router.push('/decks/add')
}
</script>

<template>
  <!-- Scrim -->
  <div
    class="fixed inset-0 z-30 transition-[background] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :class="open ? 'bg-scrim pointer-events-auto' : 'bg-transparent pointer-events-none'"
    @click="$emit('close')"
  />

  <!-- Sheet -->
  <div
    class="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t border-white/10 bg-bg-1/94 backdrop-blur-[20px] backdrop-saturate-140 shadow-[0_-16px_40px_rgba(0,0,0,0.48)] pt-3 px-5 pb-7 transition-transform duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :inert="!open"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- Drag handle -->
    <div class="w-9 h-1 rounded-full mx-auto mb-4 bg-overlay-5" />

    <div class="font-display font-bold text-fg-0 text-display-sm tracking-tight">{{ t('decks.sheet.title') }}</div>
    <div class="text-body-sm text-fg-2 mt-1 leading-relaxed">
      {{ t('decks.sheet.sub') }}
    </div>

    <div class="mt-4.5 flex flex-col gap-2.5">
      <!-- Import from URL -->
      <button
        class="flex items-center gap-3 w-full text-left border border-divider cursor-pointer text-fg-0 font-body p-3.5 bg-bg-2 rounded-lg"
        @click="goToImport"
      >
        <div class="flex items-center justify-center shrink-0 w-9 h-9 rounded-md bg-arcane-wash">
          <SbIcon name="arrow" :size="18" color="#A78BFA" />
        </div>
        <div class="flex-1">
          <div class="font-bold text-body">{{ t('decks.sheet.importFromUrl') }}</div>
          <div class="text-caption text-fg-2 mt-0.5">{{ t('decks.sheet.importFromUrlSub') }}</div>
        </div>
      </button>

      <!-- Just the commander -->
      <button
        class="flex items-center gap-3 w-full text-left border border-divider cursor-pointer text-fg-0 font-body p-3.5 bg-bg-2 rounded-lg"
        @click="$emit('close')"
      >
        <div class="flex items-center justify-center shrink-0 w-9 h-9 rounded-md bg-tide-wash">
          <SbIcon name="edit" :size="16" color="#2DD4BF" />
        </div>
        <div class="flex-1">
          <div class="font-bold text-body">{{ t('decks.sheet.justCommander') }}</div>
          <div class="text-caption text-fg-2 mt-0.5">{{ t('decks.sheet.justCommanderSub') }}</div>
        </div>
      </button>
    </div>
  </div>
</template>
