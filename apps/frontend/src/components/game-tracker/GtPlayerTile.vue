<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import { apiUrl } from '@/lib/api'
import { GT_TINT, MANA_BG } from '@/lib/mtg'
import { deathCauseKey, fmtClock, relDeath } from '@/lib/game-tracker'
import type { GtPlayer } from '@/lib/game-tracker'

const props = defineProps<{
  player: GtPlayer
  rotated: boolean
  isWinner: boolean
  gameEnded: boolean
  nowSec: number
}>()

const { t } = useI18n()

const emit = defineEmits<{
  lifeChange: [delta: number]
  poisonClick: []
  cmdrDmgClick: []
  manualDeath: []
  concede: []
}>()

const menuOpen = ref(false)

const deathAgo = computed(() => {
  const token = relDeath(props.player.deathAt, props.nowSec)
  return token ? t(token.key, { n: token.n }) : ''
})

const primary = computed(() => props.player.deck?.colors[0] ?? 'none')
const accentBg = computed(() => MANA_BG[primary.value] ?? '#8B5CF6')

const cmdImg = ref<string | null>(null)
watch(
  () => props.player.deck?.commander,
  (commander) => {
    cmdImg.value = null
    if (!commander) return
    // Routed through our own API so the browser never contacts Scryfall directly.
    const url = apiUrl(`/cards/art?name=${encodeURIComponent(commander)}&version=art_crop`)
    const img = new Image()
    img.onload = () => { cmdImg.value = url }
    img.src = url
  },
  { immediate: true },
)

const tileBg = computed(() => {
  if (props.player.dead) return '#0B0D17'
  if (cmdImg.value) {
    const tint = GT_TINT[primary.value] ?? GT_TINT.none
    return `linear-gradient(180deg, ${tint}, rgba(0,0,0,0) 40%), linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.68) 85%), url("${cmdImg.value}")`
  }
  return `linear-gradient(180deg, ${GT_TINT[primary.value] ?? GT_TINT.none}, rgba(255,255,255,0) 60%), #0E1120`
})
const borderColor = computed(() =>
  props.isWinner ? 'rgba(244,185,66,0.55)' : 'rgba(255,255,255,0.06)',
)
const lifeColor = computed(() => {
  if (props.player.dead) return '#5A586E'
  if (props.player.life <= 5) return '#F87171'
  return '#F5F4FB'
})
const totalCmdrDmg = computed(() => {
  const vals = Object.values(props.player.cmdrDmg)
  return vals.length ? Math.max(...vals) : 0
})
const poisonAlert = computed(() => props.player.poison >= 7)
const cmdrAlert = computed(() => totalCmdrDmg.value >= 18)

const avatarTintClass = computed(() => {
  if (props.player.isGuest) return 'bg-[#3D2E10] text-crown'
  if (props.player.isYou) return 'bg-[#3A2B5C] text-arcane-soft'
  return 'bg-bg-3 text-[#A8AABF]'
})

const lifeDelta = ref(0)
let deltaTimer: ReturnType<typeof setTimeout> | null = null
let lastClickTime = 0

function handleLifeChange(delta: number) {
  const now = performance.now()
  if (now - lastClickTime < 50) return
  lastClickTime = now
  emit('lifeChange', delta)
}

// Any life change (own buttons or commander damage) builds the running delta.
watch(
  () => props.player.life,
  (next, prev) => {
    lifeDelta.value += next - prev
    if (deltaTimer) clearTimeout(deltaTimer)
    deltaTimer = setTimeout(() => {
      lifeDelta.value = 0
      deltaTimer = null
    }, 5000)
  },
)

onUnmounted(() => {
  if (deltaTimer) clearTimeout(deltaTimer)
})
</script>

<template>
  <div
    role="group"
    :aria-label="player.name"
    class="relative rounded-[16px] overflow-hidden h-full flex flex-col"
    :style="{
      background: tileBg,
      backgroundSize: cmdImg ? 'auto, auto, cover' : 'auto',
      backgroundPosition: cmdImg ? 'center, center, center 20%' : 'initial',
      border: `1px solid ${borderColor}`,
      transform: rotated ? 'rotate(180deg)' : 'none',
      boxShadow: isWinner ? 'inset 0 0 0 1px rgba(244,185,66,0.30)' : 'none',
    }"
  >
    <!-- Top accent line (deck primary colour) -->
    <div
      class="absolute top-0 left-0 right-0 h-0.5"
      :style="{ background: accentBg, opacity: player.dead ? 0.18 : 0.85 }"
    />

    <!-- Header: avatar + name/commander + menu -->
    <div class="flex items-center gap-1.75 pt-2 px-2.25 shrink-0 min-w-0">
      <div
        class="w-5.5 h-5.5 rounded-full flex items-center justify-center font-display font-bold border border-divider shrink-0"
        style="font-size: 9px;"
        :class="avatarTintClass"
      >{{ (player.name || '?').charAt(0).toUpperCase() }}</div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.25 min-w-0">
          <span
            class="font-display font-bold overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
            style="font-size: 12.5px; letter-spacing: -0.005em;"
            :style="{ color: player.dead ? '#8A88A3' : '#F5F4FB' }"
          >{{ player.name }}</span>
          <span v-if="player.isYou" class="tag-pill tag-pill--you shrink-0">{{ t('game.you') }}</span>
        </div>
        <div
          v-if="player.deck"
          class="flex items-center gap-1 overflow-hidden"
          style="font-size: 10px; margin-top: 1px;"
          :style="{ color: player.dead ? '#5A586E' : '#8A88A3' }"
        >
          <div class="flex gap-px shrink-0">
            <div
              v-for="c in player.deck.colors" :key="c"
              class="rounded-full shrink-0"
              style="width: 8px; height: 8px; box-shadow: inset 0 -1px 0 rgba(0,0,0,0.18);"
              :style="{ background: MANA_BG[c] ?? '#888' }"
            />
          </div>
          <span class="italic overflow-hidden text-ellipsis whitespace-nowrap">{{ player.deck.commander }}</span>
        </div>
      </div>

      <button
        class="w-6 h-6 rounded-[7px] shrink-0 bg-overlay-1 border border-divider text-fg-2 flex items-center justify-center cursor-pointer p-0"
        :disabled="gameEnded"
        :aria-label="t('game.tracker.playerMenu')"
        @click="menuOpen = !menuOpen"
      >
        <SbIcon name="more" :size="11" :stroke="2" />
      </button>
    </div>

    <!-- Life zone: − | [delta] | number | [delta] | + -->
    <div class="flex-1 grid items-center min-h-0" style="grid-template-columns: 1fr auto auto auto 1fr; padding: 4px;">
      <button
        class="h-full w-full bg-transparent border-0 flex items-center justify-center cursor-pointer p-0 transition-colors touch-manipulation"
        style="grid-column: 1; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 28px; font-weight: 400; line-height: 1;"
        :style="{ color: player.dead ? '#3A3A4D' : '#8A88A3' }"
        :disabled="player.dead"
        :aria-label="t('game.tracker.subtractLife')"
        @mousedown="($event.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.10)'"
        @mouseup="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        @click="handleLifeChange(-1)"
      >−</button>

      <div
        v-if="lifeDelta < 0"
        class="tabular-nums font-mono font-bold text-center"
        style="grid-column: 2; font-size: 11px; color: #F87171; padding: 0 5px;"
      >{{ lifeDelta }}</div>

      <div
        class="text-center font-display font-bold tabular-nums"
        style="grid-column: 3; font-size: 60px; line-height: 0.95; letter-spacing: -0.04em; min-width: 76px;"
        :style="{
          color: lifeColor,
          textDecoration: player.dead ? 'line-through' : 'none',
          textDecorationThickness: '3px',
          textDecorationColor: 'rgba(248,113,113,0.50)',
        }"
      >{{ player.life }}</div>

      <div
        v-if="lifeDelta > 0"
        class="tabular-nums font-mono font-bold text-center"
        style="grid-column: 4; font-size: 11px; color: #A78BFA; padding: 0 5px;"
      >+{{ lifeDelta }}</div>

      <button
        class="h-full w-full bg-transparent border-0 flex items-center justify-center cursor-pointer p-0 transition-colors touch-manipulation"
        style="grid-column: 5; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 28px; font-weight: 400; line-height: 1;"
        :style="{ color: player.dead ? '#3A3A4D' : '#A78BFA' }"
        :disabled="player.dead"
        :aria-label="t('game.tracker.addLife')"
        @mousedown="($event.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.10)'"
        @mouseup="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        @click="handleLifeChange(+1)"
      >+</button>
    </div>

    <!-- Footer: poison + cmdr dmg -->
    <div class="grid gap-1.25 shrink-0" style="grid-template-columns: 1fr 1fr; padding: 0 7px 8px;">
      <button
        class="flex items-center justify-center gap-1.25 rounded-[9px] border cursor-pointer font-mono font-bold transition-colors"
        style="padding: 6px; font-size: 11.5px; letter-spacing: 0.02em;"
        :style="{
          background: poisonAlert ? 'rgba(75,174,110,0.16)' : 'rgba(255,255,255,0.03)',
          borderColor: player.poison >= 10 ? '#4BAE6E' : (poisonAlert ? 'rgba(75,174,110,0.40)' : 'rgba(255,255,255,0.06)'),
          color: poisonAlert ? '#86EFAC' : '#8A88A3',
          opacity: player.dead ? 0.55 : 1,
        }"
        :disabled="player.dead"
        @click="emit('poisonClick')"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" :fill="poisonAlert ? '#86EFAC' : '#4BAE6E'">
          <path d="M12 2.5c-.5 0-1 .3-1.3.7C8.9 5.4 4 11 4 15a8 8 0 1 0 16 0c0-4-4.9-9.6-6.7-11.8A1.6 1.6 0 0 0 12 2.5z"/>
        </svg>
        <span class="tabular-nums">{{ player.poison }}</span>
        <span style="color: #5A586E; font-weight: 600; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;">{{ t('game.tracker.poison') }}</span>
      </button>

      <button
        class="flex items-center justify-center gap-1.25 rounded-[9px] border cursor-pointer font-mono font-bold transition-colors"
        style="padding: 6px; font-size: 11.5px; letter-spacing: 0.02em;"
        :style="{
          background: cmdrAlert ? 'rgba(244,185,66,0.16)' : 'rgba(255,255,255,0.03)',
          borderColor: totalCmdrDmg >= 21 ? '#F4B942' : (cmdrAlert ? 'rgba(244,185,66,0.40)' : 'rgba(255,255,255,0.06)'),
          color: cmdrAlert ? '#FCD34D' : '#8A88A3',
          opacity: player.dead ? 0.55 : 1,
        }"
        :disabled="player.dead"
        @click="emit('cmdrDmgClick')"
      >
        <SbIcon name="swords" :size="12" :color="cmdrAlert ? '#FCD34D' : '#F4B942'" :stroke="2" />
        <span class="tabular-nums">{{ totalCmdrDmg }}</span>
        <span style="color: #5A586E; font-weight: 600; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;">{{ t('game.tracker.cmd') }}</span>
      </button>
    </div>

    <!-- Death overlay -->
    <div
      v-if="player.dead && !isWinner"
      class="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none"
      style="background: rgba(6,7,13,0.62); backdrop-filter: blur(2px);"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F87171" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3a8 8 0 0 0-8 8v4a3 3 0 0 0 1.5 2.6L7 18v2a1 1 0 0 0 1 1h2v-3h4v3h2a1 1 0 0 0 1-1v-2l1.5-.4A3 3 0 0 0 20 15v-4a8 8 0 0 0-8-8z"/>
        <circle cx="9" cy="12" r="1.4" fill="#F87171"/>
        <circle cx="15" cy="12" r="1.4" fill="#F87171"/>
      </svg>
      <div class="font-display font-bold text-danger" style="font-size: 13.5px; letter-spacing: 0.10em; text-transform: uppercase;">{{ t('game.tracker.eliminated') }}</div>
      <div class="text-fg-2 text-center leading-snug" style="font-size: 10.5px; max-width: 140px;">
        {{ t(deathCauseKey(player.deathCause)) }}<br/>
        <span class="font-mono text-fg-3">{{ fmtClock(player.deathAt ?? 0) }} · {{ deathAgo }}</span>
      </div>
    </div>

    <!-- Winner overlay -->
    <div
      v-if="isWinner"
      class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none"
      style="background: linear-gradient(180deg, rgba(244,185,66,0.20), rgba(244,185,66,0.04) 60%, transparent);"
    >
      <div class="w-11 h-11 rounded-full flex items-center justify-center" style="background: rgba(244,185,66,0.16); border: 1px solid rgba(244,185,66,0.40);">
        <SbIcon name="crown" :size="22" color="#F4B942" :stroke="2" />
      </div>
      <div class="font-display font-bold text-crown" style="font-size: 16px; letter-spacing: -0.01em;">{{ t('game.tracker.winner') }}</div>
      <div class="text-fg-1 text-center leading-snug" style="font-size: 10.5px;">{{ t('game.tracker.lastStanding') }}</div>
    </div>

    <!-- Per-tile dropdown menu -->
    <div
      v-if="menuOpen && !player.dead"
      class="absolute inset-0 z-[4] flex items-center justify-center p-2.5"
      style="background: rgba(6,7,13,0.78); backdrop-filter: blur(6px);"
      @click="menuOpen = false"
    >
      <div
        class="w-full rounded-[12px] flex flex-col gap-0.5"
        style="background: #0E1120; border: 1px solid rgba(255,255,255,0.10); padding: 6px;"
        @click.stop
      >
        <div class="px-2 pt-1 pb-1.5 text-fg-3 font-bold uppercase" style="font-size: 9.5px; letter-spacing: 0.10em;">{{ player.name }}</div>

        <!-- Player died -->
        <button
          class="flex items-center gap-2.25 w-full text-left rounded-[8px] border-0 bg-transparent cursor-pointer"
          style="padding: 7px 8px; color: #F87171;"
          @click="menuOpen = false; emit('manualDeath')"
        >
          <div class="w-5.5 h-5.5 rounded-[6px] shrink-0 flex items-center justify-center" style="background: rgba(248,113,113,0.12);">
            <SbIcon name="x" :size="11" color="#F87171" :stroke="2" />
          </div>
          <div class="min-w-0">
            <div class="font-bold" style="font-size: 12px; letter-spacing: -0.005em;">{{ t('game.tracker.playerDied') }}</div>
            <div class="text-fg-3" style="font-size: 10px; margin-top: 1px;">{{ t('game.tracker.playerDiedSub') }}</div>
          </div>
        </button>

        <!-- Concede -->
        <button
          class="flex items-center gap-2.25 w-full text-left rounded-[8px] border-0 bg-transparent cursor-pointer text-fg-0"
          style="padding: 7px 8px;"
          @click="menuOpen = false; emit('concede')"
        >
          <div class="w-5.5 h-5.5 rounded-[6px] shrink-0 flex items-center justify-center" style="background: rgba(255,255,255,0.04);">
            <SbIcon name="back" :size="11" color="#8A88A3" :stroke="2" />
          </div>
          <div class="min-w-0">
            <div class="font-bold" style="font-size: 12px; letter-spacing: -0.005em;">{{ t('game.tracker.concede') }}</div>
            <div class="text-fg-3" style="font-size: 10px; margin-top: 1px;">{{ t('game.tracker.concedeSub') }}</div>
          </div>
        </button>

        <!-- Cancel -->
        <button
          class="flex items-center gap-2.25 w-full text-left rounded-[8px] border-0 bg-transparent cursor-pointer text-fg-3"
          style="padding: 7px 8px;"
          @click="menuOpen = false"
        >
          <div class="w-5.5 h-5.5 rounded-[6px] shrink-0 flex items-center justify-center" style="background: rgba(255,255,255,0.04);">
            <SbIcon name="x" :size="11" color="#5A586E" :stroke="2" />
          </div>
          <div class="font-bold" style="font-size: 12px; letter-spacing: -0.005em;">{{ t('game.tracker.cancel') }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
