<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  podName: string
  inviteCode: string
}>()

const emit = defineEmits<{ close: [] }>()

const copied = ref(false)

watch(() => props.open, (v) => {
  if (!v) copied.value = false
})

function copy() {
  navigator.clipboard.writeText(props.inviteCode).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1600)
}
</script>

<template>
  <!-- Scrim -->
  <div
    class="fixed inset-0 z-30 transition-[background] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :class="open ? 'bg-scrim pointer-events-auto backdrop-blur-[2px]' : 'bg-transparent pointer-events-none'"
    @click="emit('close')"
  />

  <!-- Sheet -->
  <div
    class="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t border-white/10 bg-bg-1/94 backdrop-blur-[20px] backdrop-saturate-140 shadow-[0_-16px_40px_rgba(0,0,0,0.48)] pt-3 px-5 pb-7 transition-transform duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :inert="!open"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- Drag handle -->
    <div class="w-9 h-1 rounded-full mx-auto mb-4 bg-overlay-5" />

    <!-- Eyebrow -->
    <div class="font-semibold text-[10px] text-fg-3 tracking-eyebrow uppercase">{{ t('playgroups.inviteSheet.inviteTo', { podName }) }}</div>

    <div class="font-display font-bold text-fg-0 mt-1.5 text-display-sm tracking-tight">{{ t('playgroups.inviteSheet.shareTitle') }}</div>
    <div class="leading-relaxed mt-1 text-body-sm text-fg-2">
      {{ t('playgroups.inviteSheet.shareSub') }}
    </div>

    <!-- Code box -->
    <div class="flex items-center justify-between gap-2.5 mt-4.5 py-4.5 px-4 bg-bg-0 border border-dashed border-white/16 rounded-[14px]">
      <div class="font-mono font-semibold text-fg-0 text-[20px] tracking-wide">{{ inviteCode }}</div>

      <button
        class="flex items-center gap-1.5 border-0 font-bold font-body cursor-pointer h-9 px-3.5 rounded-md text-caption transition-colors duration-160"
        :class="copied ? 'bg-success/16 text-success' : 'bg-bg-2 text-fg-0'"
        @click="copy"
      >
        <SbIcon v-if="copied" name="check" :size="12" :stroke="2.6" />
        {{ copied ? t('playgroups.inviteSheet.copied') : t('playgroups.inviteSheet.copy') }}
      </button>
    </div>

    <!-- Discord CTA -->
    <button
      class="w-full h-12 mt-3.5 border-0 font-bold text-body font-body text-white cursor-pointer bg-arcane rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
    >{{ t('playgroups.inviteSheet.shareViaDiscord') }}</button>
  </div>
</template>
