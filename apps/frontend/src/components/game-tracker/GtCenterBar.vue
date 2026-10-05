<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { fmtClock } from '@/lib/game-tracker'

const { t } = useI18n()

defineProps<{
  elapsedSec: number
  paused: boolean
  aliveCount: number
  totalCount: number
  gameEnded: boolean
}>()

const emit = defineEmits<{
  pause: []
  menu: []
}>()
</script>

<template>
  <!-- Pill bar — grid: [rotated info | buttons | normal info] -->
  <div
    class="shrink-0 grid items-center relative z-[2]"
    style="
      height: 50px;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      padding: 0 8px;
      background: rgba(14,17,32,0.92);
      backdrop-filter: blur(20px) saturate(140%);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 9999px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.45);
    "
  >
    <!-- Top-bank view (rotated 180° so those players can read it) -->
    <div style="transform: rotate(180deg);">
      <div class="flex items-center gap-2.5 justify-end px-3 min-w-0">
        <div
          class="font-mono font-bold tabular-nums leading-none"
          style="font-size: 17px; letter-spacing: 0.02em;"
          :style="{ color: gameEnded ? '#8A88A3' : '#F5F4FB' }"
        >{{ fmtClock(elapsedSec) }}</div>
        <div class="w-px h-4 bg-overlay-3 shrink-0" />
        <div class="flex flex-col items-center leading-none min-w-0">
          <div class="flex items-baseline gap-1 font-bold">
            <span
              class="font-display"
              style="font-size: 15px; letter-spacing: -0.01em;"
              :style="{ color: gameEnded ? '#F4B942' : '#A78BFA' }"
            >{{ aliveCount }}</span>
            <span style="font-size: 11px; color: #3A3A4D;">/</span>
            <span style="font-size: 11px; color: #8A88A3;">{{ totalCount }}</span>
          </div>
          <span class="uppercase font-bold truncate max-w-full" style="font-size: 8px; letter-spacing: 0.1em; color: #5A586E; margin-top: 3px;">{{ t('game.tracker.alive') }}</span>
        </div>
      </div>
    </div>

    <!-- Center buttons (icon-only, symmetric for both orientations) -->
    <div class="flex items-center gap-2 px-1">
      <!-- Pause / play -->
      <button
        class="flex items-center justify-center rounded-full border-0 cursor-pointer p-0 transition-colors"
        style="width: 36px; height: 36px;"
        :style="{
          background: gameEnded ? 'rgba(255,255,255,0.04)' : (paused ? 'rgba(244,185,66,0.18)' : 'rgba(255,255,255,0.06)'),
          color: gameEnded ? '#5A586E' : (paused ? '#F4B942' : '#C4C1D8'),
          cursor: gameEnded ? 'not-allowed' : 'pointer',
        }"
        :disabled="gameEnded"
        :aria-label="paused ? t('game.tracker.resume') : t('game.tracker.pause')"
        @click="emit('pause')"
      >
        <!-- Play triangle -->
        <svg v-if="paused" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4l14 8-14 8z"/>
        </svg>
        <!-- Pause bars -->
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      </button>

      <!-- Menu / finish button -->
      <button
        class="flex items-center justify-center rounded-full border-0 cursor-pointer p-0 transition-colors"
        style="width: 36px; height: 36px;"
        :style="{
          background: gameEnded ? '#F4B942' : 'rgba(248,113,113,0.16)',
          color: gameEnded ? '#06070D' : '#F87171',
        }"
        :aria-label="t('game.tracker.gameMenu')"
        @click="emit('menu')"
      >
        <!-- Check mark when ended -->
        <svg v-if="gameEnded" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12l5 5 9-12"/>
        </svg>
        <!-- Stop square while playing -->
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1.5"/>
        </svg>
      </button>
    </div>

    <!-- Bottom-bank view (normal orientation) -->
    <div class="flex items-center gap-2.5 px-3 min-w-0">
      <div
        class="font-mono font-bold tabular-nums leading-none"
        style="font-size: 17px; letter-spacing: 0.02em;"
        :style="{ color: gameEnded ? '#8A88A3' : '#F5F4FB' }"
      >{{ fmtClock(elapsedSec) }}</div>
      <div class="w-px h-4 bg-overlay-3 shrink-0" />
      <div class="flex flex-col items-center leading-none min-w-0">
        <div class="flex items-baseline gap-1 font-bold">
          <span
            class="font-display"
            style="font-size: 15px; letter-spacing: -0.01em;"
            :style="{ color: gameEnded ? '#F4B942' : '#A78BFA' }"
          >{{ aliveCount }}</span>
          <span style="font-size: 11px; color: #3A3A4D;">/</span>
          <span style="font-size: 11px; color: #8A88A3;">{{ totalCount }}</span>
        </div>
        <span class="uppercase font-bold truncate max-w-full" style="font-size: 8px; letter-spacing: 0.1em; color: #5A586E; margin-top: 3px;">{{ t('game.tracker.alive') }}</span>
      </div>
    </div>
  </div>
</template>
