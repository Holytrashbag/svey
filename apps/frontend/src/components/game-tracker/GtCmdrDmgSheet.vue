<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GtSheet from './GtSheet.vue'
import { CMDR_DMG_MAX } from '@/lib/game-tracker'
import type { GtPlayer } from '@/lib/game-tracker'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  target: GtPlayer | null
  players: GtPlayer[]
}>()

const emit = defineEmits<{
  close: []
  change: [attackerSeatIdx: number, dmg: number]
}>()

const others = computed(() =>
  props.target
    ? props.players.filter(p => p.seatIdx !== props.target!.seatIdx)
    : [],
)

const avatarTintClass = (p: GtPlayer) => {
  if (p.isGuest) return 'bg-[#3D2E10] text-crown'
  if (p.isYou) return 'bg-[#3A2B5C] text-arcane-soft'
  return 'bg-bg-3 text-[#A8AABF]'
}
</script>

<template>
  <GtSheet
    :open="open"
    :title="target ? t('game.cmdrDmg.title', { name: target.name }) : ''"
    :subtitle="t('game.cmdrDmg.subtitle')"
    @close="emit('close')"
  >
    <div v-if="target" class="flex flex-col gap-2">
      <div
        v-for="att in others"
        :key="att.seatIdx"
        class="grid items-center rounded-[12px] border"
        style="grid-template-columns: 1fr auto; gap: 10px; padding: 10px 12px;"
        :style="{
          background: (target.cmdrDmg[att.seatIdx] ?? 0) >= 21 ? 'rgba(244,185,66,0.10)' : '#06070D',
          borderColor: (target.cmdrDmg[att.seatIdx] ?? 0) >= 21 ? 'rgba(244,185,66,0.55)' : 'rgba(255,255,255,0.06)',
        }"
      >
        <!-- Attacker info -->
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-body-sm shrink-0 border border-divider"
            :class="avatarTintClass(att)"
          >{{ (att.name || '?').charAt(0).toUpperCase() }}</div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-fg-0 overflow-hidden text-ellipsis whitespace-nowrap" style="font-size: 13.5px;">{{ att.name }}</div>
            <div v-if="att.deck" class="text-fg-2 italic overflow-hidden text-ellipsis whitespace-nowrap" style="font-size: 11px; margin-top: 1px;">{{ att.deck.commander }}</div>
          </div>
        </div>

        <!-- Stepper -->
        <div class="inline-flex items-center gap-1.5">
          <button
            class="flex items-center justify-center rounded-[9px] border-0 cursor-pointer p-0 disabled:opacity-40 disabled:cursor-default"
            style="width: 32px; height: 32px; background: rgba(255,255,255,0.04); color: #C4C1D8; font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 18px; line-height: 1;"
            :aria-label="t('game.cmdrDmg.less', { name: att.name })"
            :disabled="target.dead"
            @click="emit('change', att.seatIdx, Math.max(0, (target.cmdrDmg[att.seatIdx] ?? 0) - 1))"
          >−</button>

          <div
            class="text-center font-display font-bold tabular-nums"
            style="min-width: 38px; font-size: 22px; letter-spacing: -0.02em;"
            :style="{
              color: (target.cmdrDmg[att.seatIdx] ?? 0) >= 21
                ? '#F4B942'
                : ((target.cmdrDmg[att.seatIdx] ?? 0) >= 18 ? '#FCD34D' : '#F5F4FB'),
            }"
          >{{ target.cmdrDmg[att.seatIdx] ?? 0 }}</div>

          <button
            class="flex items-center justify-center rounded-[9px] border-0 cursor-pointer p-0 disabled:opacity-40 disabled:cursor-default"
            style="width: 32px; height: 32px; font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 18px; line-height: 1;"
            :style="{
              background: (target.cmdrDmg[att.seatIdx] ?? 0) >= 21 ? 'rgba(244,185,66,0.20)' : 'rgba(139,92,246,0.18)',
              color: (target.cmdrDmg[att.seatIdx] ?? 0) >= 21 ? '#F4B942' : '#A78BFA',
            }"
            :aria-label="t('game.cmdrDmg.more', { name: att.name })"
            :disabled="target.dead"
            @click="emit('change', att.seatIdx, Math.min(CMDR_DMG_MAX, (target.cmdrDmg[att.seatIdx] ?? 0) + 1))"
          >+</button>
        </div>
      </div>
    </div>
  </GtSheet>
</template>
