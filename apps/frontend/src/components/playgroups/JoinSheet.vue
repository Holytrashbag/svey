<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  open:      boolean
  loading?:  boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  close:  []
  submit: [code: string]
}>()

const code = ref('')
const localError = ref('')
const focused = ref(false)

watch(() => props.open, (v) => {
  if (v) { code.value = ''; localError.value = '' }
})

const borderColor = computed(() => {
  if (focused.value) return 'rgba(139,92,246,0.6)'
  if (localError.value || props.serverError) return 'rgba(248,113,113,0.5)'
  return 'rgba(255,255,255,0.10)'
})

function onInput(e: Event) {
  code.value = (e.target as HTMLInputElement).value.toUpperCase()
  localError.value = ''
}

function submit() {
  if (code.value.length < 5) { localError.value = t('playgroups.joinSheet.tooShort'); return }
  emit('submit', code.value)
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

    <div class="font-display font-bold text-fg-0 text-display-sm tracking-tight">{{ t('playgroups.joinSheet.title') }}</div>
    <div class="text-body-sm text-fg-2 mt-1 leading-relaxed">
      <i18n-t keypath="playgroups.joinSheet.intro" tag="span">
        <template #example>
          <span class="font-mono text-fg-1">SPELL-XKQR-92</span>
        </template>
      </i18n-t>
    </div>

    <div class="mt-4.5">
      <input
        :value="code"
        placeholder="SPELL-XKQR-92"
        autocorrect="off"
        spellcheck="false"
        class="w-full h-13 font-mono font-semibold text-fg-0 outline-none box-border px-4 bg-bg-0 rounded-lg text-[16px] tracking-[0.04em] transition-[border-color] duration-160 ease-linear border"
        :style="{ borderColor }"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <div v-if="localError || serverError" class="text-caption text-danger mt-2">
        {{ localError || serverError }}
      </div>
    </div>

    <button
      :disabled="!code || loading"
      class="w-full h-12 mt-3.5 border-0 font-bold text-body font-body rounded-lg transition-colors duration-160"
      :class="code && !loading
        ? 'bg-arcane text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
        : 'bg-bg-2 text-fg-3 cursor-not-allowed'"
      @click="submit"
    >{{ loading ? t('playgroups.joinSheet.joining') : t('playgroups.joinSheet.join') }}</button>
  </div>
</template>
