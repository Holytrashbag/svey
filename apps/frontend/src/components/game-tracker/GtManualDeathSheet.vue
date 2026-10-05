<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GtSheet from './GtSheet.vue'
import { fmtClock } from '@/lib/game-tracker'
import type { GtPlayer } from '@/lib/game-tracker'

const { t } = useI18n()

defineProps<{
  open: boolean
  player: GtPlayer | null
  nowSec: number
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <GtSheet
    :open="open"
    :title="player ? t('game.manualDeath.title', { name: player.name }) : ''"
    :subtitle="t('game.manualDeath.subtitle')"
    @close="emit('close')"
  >
    <!-- Info row -->
    <div
      class="flex items-center gap-3.5 rounded-[12px] border border-divider"
      style="padding: 12px 14px; background: #06070D;"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F87171" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3a8 8 0 0 0-8 8v4a3 3 0 0 0 1.5 2.6L7 18v2a1 1 0 0 0 1 1h2v-3h4v3h2a1 1 0 0 0 1-1v-2l1.5-.4A3 3 0 0 0 20 15v-4a8 8 0 0 0-8-8z"/>
        <circle cx="9" cy="12" r="1.4" fill="#F87171"/>
        <circle cx="15" cy="12" r="1.4" fill="#F87171"/>
      </svg>
      <div class="flex-1">
        <div class="font-bold text-fg-0" style="font-size: 13.5px;">{{ t('game.manualDeath.markEliminated') }}</div>
        <div class="text-fg-2 leading-snug" style="font-size: 11.5px; margin-top: 2px; line-height: 1.4;">
          <i18n-t keypath="game.manualDeath.logsTime" tag="span">
            <template #time>
              <span class="font-mono text-fg-1">{{ fmtClock(nowSec) }}</span>
            </template>
          </i18n-t>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-3.5">
      <button
        class="flex-1 h-11.5 rounded-[12px] border cursor-pointer font-body font-semibold"
        style="background: transparent; color: #8A88A3; border-color: rgba(255,255,255,0.10); font-size: 14px;"
        @click="emit('close')"
      >{{ t('game.manualDeath.notYet') }}</button>
      <button
        class="flex-[2] h-11.5 rounded-[12px] border cursor-pointer font-body font-bold inline-flex items-center justify-center gap-2"
        style="background: rgba(248,113,113,0.18); color: #F87171; border-color: rgba(248,113,113,0.40); font-size: 14px;"
        @click="emit('confirm')"
      >{{ t('game.manualDeath.confirm') }}</button>
    </div>
  </GtSheet>
</template>
