<script setup lang="ts">
import { ref, computed, watch, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import GtSheet from './GtSheet.vue'
import SbIcon from '@/components/ui/SbIcon.vue'
import { RETIRE_REASON_IDS, type GtPlayer } from '@/lib/game-tracker'

type Mode = 'concede' | 'retire' | 'cancel'

const props = defineProps<{
  open: boolean
  mode: Mode
  player: GtPlayer | null
}>()

const emit = defineEmits<{
  close: []
  // `note` is only filled in retire mode (stored as the game's abandonNotes).
  confirm: [pickedReasons: string[], note: string]
}>()

const { t } = useI18n()

const picked = ref<string[]>([])
const note   = ref('')
const noteHintId = useId()

watch(() => [props.open, props.mode, props.player?.seatIdx], () => {
  if (props.open) {
    picked.value = []
    note.value   = ''
  }
})

// Reason ids are persisted with the game; labels live under
// `game.endReasons.<mode>.reasons.<id>`.
const REASON_IDS: Record<Mode, string[]> = {
  concede: ['noway', 'time', 'salty', 'rules', 'social'],
  retire:  [...RETIRE_REASON_IDS],
  cancel:  ['mulligan', 'rules', 'misdeal', 'time', 'other'],
}

const STYLE: Record<Mode, { bg: string; color: string; border: string }> = {
  concede: { bg: '#8B5CF6',                color: '#fff',    border: 'transparent' },
  retire:  { bg: 'rgba(244,185,66,0.20)',  color: '#F4B942', border: 'rgba(244,185,66,0.40)' },
  cancel:  { bg: 'rgba(248,113,113,0.16)', color: '#F87171', border: 'rgba(248,113,113,0.40)' },
}

const cfg = computed(() => {
  const mode = props.mode
  const base = `game.endReasons.${mode}`
  return {
    title: t(`${base}.title`, { name: props.player?.name ?? '' }),
    subtitle: t(`${base}.subtitle`),
    confirmLabel: t(`${base}.confirm`),
    reasons: REASON_IDS[mode].map((id) => ({
      id,
      label: t(`${base}.reasons.${id}.label`),
      sub: t(`${base}.reasons.${id}.sub`),
    })),
    style: STYLE[mode],
  }
})

function onConfirm() {
  emit('confirm', picked.value, props.mode === 'retire' ? note.value.trim() : '')
}

function toggle(id: string) {
  if (picked.value.includes(id)) {
    picked.value = picked.value.filter(x => x !== id)
  } else {
    picked.value = [...picked.value, id]
  }
}
</script>

<template>
  <GtSheet
    :open="open"
    :title="cfg.title"
    :subtitle="cfg.subtitle"
    @close="emit('close')"
  >
    <div>
      <!-- Reason label -->
      <div class="text-fg-3 font-bold uppercase mb-2" style="font-size: 10px; letter-spacing: 0.10em;">
        {{ t('game.endReasons.why') }} <span class="normal-case tracking-normal font-medium text-fg-3">{{ t('game.endReasons.whyHint') }}</span>
      </div>

      <!-- Reason list -->
      <div class="flex flex-col gap-1.5">
        <button
          v-for="r in cfg.reasons"
          :key="r.id"
          class="grid items-center w-full text-left rounded-[10px] border cursor-pointer transition-all duration-160"
          style="grid-template-columns: auto 1fr; gap: 12px; padding: 10px 12px;"
          :style="{
            background: picked.includes(r.id) ? 'rgba(139,92,246,0.10)' : '#06070D',
            borderColor: picked.includes(r.id) ? 'rgba(167,139,250,0.55)' : 'rgba(255,255,255,0.06)',
          }"
          @click="toggle(r.id)"
        >
          <div
            class="w-4.5 h-4.5 rounded-[5px] shrink-0 flex items-center justify-center"
            :style="{
              background: picked.includes(r.id) ? '#8B5CF6' : 'transparent',
              border: picked.includes(r.id) ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
            }"
          >
            <SbIcon v-if="picked.includes(r.id)" name="check" :size="11" color="#fff" :stroke="3" />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-fg-0" style="font-size: 13.5px;">{{ r.label }}</div>
            <div class="text-fg-2" style="font-size: 11px; margin-top: 1px;">{{ r.sub }}</div>
          </div>
        </button>
      </div>

      <!-- Retire notes (shown on the recap) -->
      <div v-if="mode === 'retire'" class="mt-3">
        <textarea
          v-model="note"
          rows="2"
          maxlength="500"
          :aria-label="t('game.endReasons.retire.notesLabel')"
          :aria-describedby="noteHintId"
          :placeholder="t('game.endReasons.retire.notesPlaceholder')"
          class="w-full rounded-xl bg-bg-1 border border-white/8 text-fg-0 placeholder-fg-4 resize-none px-3 py-2.5 text-sm font-body outline-none focus:border-arcane/50 transition-colors duration-160"
        />
        <p :id="noteHintId" class="text-caption text-fg-3 mt-1">{{ t('game.endReasons.retire.notesHint') }}</p>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 mt-4">
        <button
          class="flex-1 h-11.5 rounded-[12px] border cursor-pointer font-body font-semibold"
          style="background: transparent; color: #8A88A3; border-color: rgba(255,255,255,0.10); font-size: 14px;"
          @click="emit('close')"
        >{{ t('game.endReasons.back') }}</button>
        <button
          class="flex-[2] h-11.5 rounded-[12px] border cursor-pointer font-body font-bold"
          style="font-size: 14px;"
          :style="{
            background: cfg.style.bg,
            color: cfg.style.color,
            borderColor: cfg.style.border,
          }"
          @click="onConfirm"
        >{{ cfg.confirmLabel }}</button>
      </div>
    </div>
  </GtSheet>
</template>
