<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import GtPlayerTile from '@/components/game-tracker/GtPlayerTile.vue'
import GtCenterBar from '@/components/game-tracker/GtCenterBar.vue'
import GtCmdrDmgSheet from '@/components/game-tracker/GtCmdrDmgSheet.vue'
import GtConcedeSheet from '@/components/game-tracker/GtConcedeSheet.vue'
import GtManualDeathSheet from '@/components/game-tracker/GtManualDeathSheet.vue'
import GtGameMenu from '@/components/game-tracker/GtGameMenu.vue'
import {
  applyCmdrDmg, autoDeath, gridForCount,
  SESSION_KEY, RESULT_KEY,
} from '@/lib/game-tracker'
import type { GtPlayer, GameSessionData, GameResultData } from '@/lib/game-tracker'
import { useCardStore } from '@/stores/useCardStore'

const router = useRouter()
const cardStore = useCardStore()
const { t } = useI18n()

// ── Init players ──────────────────────────────────────────────────────────────

function buildPlayersFromSession(session: GameSessionData): GtPlayer[] {
  return session.seats.map((s, i) => ({
    seatIdx:   i,
    name:      s.isGuest ? (s.guestName || t('game.guest')) : (s.playerName || t('game.seat', { n: i + 1 })),
    isYou:     s.isYou,
    isGuest:   s.isGuest,
    deck:      s.deckId
      ? { id: s.deckId, colors: s.deckColors, commander: s.deckCommander ?? s.deckName ?? '' }
      : null,
    life:      session.startLife,
    poison:    0,
    cmdrDmg:   {},
    dead:      false,
    deathAt:   null,
    deathCause: null,
  }))
}

function buildDemoPlayers(): GtPlayer[] {
  return [
    { seatIdx: 0, name: 'Ryan', isYou: true,  isGuest: false, deck: { id: 'demo-1', colors: ['W','U','B','G'], commander: 'Atraxa' }, life: 40, poison: 0, cmdrDmg: {}, dead: false, deathAt: null, deathCause: null },
    { seatIdx: 1, name: 'Dave', isYou: false, isGuest: false, deck: { id: 'demo-2', colors: ['W','U','B','G'], commander: 'Atraxa' }, life: 40, poison: 0, cmdrDmg: {}, dead: false, deathAt: null, deathCause: null },
    { seatIdx: 2, name: 'Maya', isYou: false, isGuest: false, deck: { id: 'demo-3', colors: ['B','R','G'],     commander: 'Korvold' }, life: 40, poison: 0, cmdrDmg: {}, dead: false, deathAt: null, deathCause: null },
    { seatIdx: 3, name: 'Lina', isYou: false, isGuest: false, deck: { id: 'demo-4', colors: ['W','B','R'],     commander: 'Edgar Markov' }, life: 40, poison: 0, cmdrDmg: {}, dead: false, deathAt: null, deathCause: null },
  ]
}

function seedMidgame(ps: GtPlayer[]): GtPlayer[] {
  const out = ps.map(p => ({ ...p, cmdrDmg: { ...p.cmdrDmg } }))
  if (out[0]) out[0].life = 32
  if (out[1]) { out[1].life = 24; out[1].cmdrDmg[0] = 7 }
  if (out[2]) { out[2].life = 18; out[2].poison = 3 }
  if (out[3]) { out[3].life = 28; out[3].cmdrDmg[2] = 11 }
  return out
}

// ── State ─────────────────────────────────────────────────────────────────────

const saved = localStorage.getItem(SESSION_KEY)
const session: GameSessionData | null = saved ? (JSON.parse(saved) as GameSessionData) : null
const podId = session?.podId ?? 'tuesday'

const players = ref<GtPlayer[]>(
  session ? buildPlayersFromSession(session) : seedMidgame(buildDemoPlayers()),
)

const paused = ref(false)
const elapsed = ref(session ? 0 : 1224)  // 0 for real games, midgame seed for demo
const ended = ref(false)    // explicitly ended via menu

type Sheet = 'none' | 'cmdrDmg' | 'manualDeath' | 'concede' | 'retire' | 'cancel' | 'menu'
const activeSheet = ref<Sheet>('none')
const activeSeatIdx = ref(0)
const concedeMode = ref<'concede' | 'retire' | 'cancel'>('concede')

// ── Timer ─────────────────────────────────────────────────────────────────────

let timerId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timerId = setInterval(() => {
    if (!paused.value && !ended.value) elapsed.value++
  }, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})

// ── Computed ──────────────────────────────────────────────────────────────────

const alivePlayers = computed(() => players.value.filter(p => !p.dead))
const winner = computed(() =>
  ended.value && alivePlayers.value.length === 1 ? alivePlayers.value[0] : null,
)
const gameEnded = computed(() => !!winner.value)
const grid = computed(() => gridForCount(players.value.length))
// Seat indices from the grid resolved to players (top bank, bottom bank).
const banks = computed(() =>
  grid.value.rows.map((row) => row.flatMap((i) => players.value[i] ?? [])),
)
const activePlayer = computed(() => players.value[activeSeatIdx.value] ?? null)

// ── Card art credits ────────────────────────────────────────────────────────
// Scryfall requires the illustrator be identifiable wherever we render art_crops
// (here, the player tile backgrounds). Resolve lazily when the game menu opens.
const commanderNames = computed(() => [
  ...new Set(
    players.value
      .map((p) => p.deck?.commander)
      .filter((c): c is string => !!c),
  ),
])

watch(
  () => activeSheet.value,
  (sheet) => {
    if (sheet === 'menu') {
      commanderNames.value.forEach((name) => void cardStore.fetchArtist({ name }))
    }
  },
)

const artCredits = computed(() =>
  commanderNames.value
    .map((name) => ({ name, artist: cardStore.artistFor({ name }) }))
    .filter((c): c is { name: string; artist: string } => !!c.artist),
)

// ── Mutations ─────────────────────────────────────────────────────────────────

function updatePlayer(idx: number, patch: Partial<GtPlayer>) {
  const p = players.value[idx]
  if (!p) return
  const next: GtPlayer = { ...p, ...patch }
  if (patch.cmdrDmg) next.cmdrDmg = { ...p.cmdrDmg, ...patch.cmdrDmg }
  const cause = autoDeath(next)
  if (cause && !next.dead) {
    next.dead = true
    next.deathAt = elapsed.value
    next.deathCause = cause
  }
  players.value[idx] = next
  const alive = players.value.filter(p => !p.dead)
  if (!ended.value && alive.length === 1 && players.value.length > 1) {
    onEndGame()
  }
}

function onLife(idx: number, delta: number) {
  const p = players.value[idx]
  if (p) updatePlayer(idx, { life: p.life + delta })
}

function onPoison(idx: number) {
  const p = players.value[idx]
  if (p) updatePlayer(idx, { poison: Math.min(15, p.poison + 1) })
}

function onCmdrDmg(targetIdx: number, attackerIdx: number, dmg: number) {
  const p = players.value[targetIdx]
  if (!p || p.dead) return // no revive: a dead target's numbers are frozen
  updatePlayer(targetIdx, applyCmdrDmg(p, attackerIdx, dmg))
}

function onManualDeath(idx: number) {
  updatePlayer(idx, { dead: true, deathAt: elapsed.value, deathCause: 'manual' })
}

function onConcede(idx: number) {
  updatePlayer(idx, { dead: true, deathAt: elapsed.value, deathCause: 'concede' })
}

// ── Sheet handlers ────────────────────────────────────────────────────────────

function openCmdrDmg(idx: number) { activeSeatIdx.value = idx; activeSheet.value = 'cmdrDmg' }
function openManualDeath(idx: number) { activeSeatIdx.value = idx; activeSheet.value = 'manualDeath' }
function openConcede(idx: number) {
  activeSeatIdx.value = idx
  concedeMode.value = 'concede'
  activeSheet.value = 'concede'
}
function closeSheet() { activeSheet.value = 'none' }

function onConcedeConfirm(reasons: string[], note: string) {
  closeSheet()
  if (concedeMode.value === 'concede') {
    onConcede(activeSeatIdx.value)
  } else if (concedeMode.value === 'retire') {
    // Logged with no winner; still goes through the survey and counts as played.
    finishGame('abandoned', reasons, note || undefined)
  } else {
    // Cancel: nothing is recorded.
    localStorage.removeItem(SESSION_KEY)
    router.back()
  }
}

function finishGame(endReason: GameResultData['endReason'], abandonReasons?: string[], abandonNotes?: string) {
  ended.value = true
  closeSheet()
  const result: GameResultData = {
    podId,
    players: players.value,
    durationSec: elapsed.value,
    endReason,
    abandonReasons,
    abandonNotes,
  }
  localStorage.setItem(RESULT_KEY, JSON.stringify(result))
  void router.push(`/pods/${podId}/game/survey`)
}

function onEndGame() {
  finishGame('won')
}

function onRetireGame() {
  concedeMode.value = 'retire'
  activeSheet.value = 'retire'
}

function onCancelGame() {
  concedeMode.value = 'cancel'
  activeSheet.value = 'cancel'
}
</script>

<template>
  <div class="absolute inset-0 bg-bg-0 text-fg-0 overflow-hidden flex flex-col p-2 gap-2">

    <!-- Top bank (rotated 180° so those players read correctly) -->
    <div
      v-if="banks[0]"
      class="flex-1 grid min-h-0 gap-2"
      :style="{ gridTemplateColumns: `repeat(${banks[0].length}, 1fr)` }"
    >
      <GtPlayerTile
        v-for="p in banks[0]"
        :key="p.seatIdx"
        :player="p"
        :rotated="true"
        :is-winner="winner?.seatIdx === p.seatIdx"
        :game-ended="gameEnded"
        :now-sec="elapsed"
        @life-change="(d) => onLife(p.seatIdx, d)"
        @poison-click="onPoison(p.seatIdx)"
        @cmdr-dmg-click="openCmdrDmg(p.seatIdx)"
        @manual-death="openManualDeath(p.seatIdx)"
        @concede="openConcede(p.seatIdx)"
      />
    </div>

    <!-- Center seam bar -->
    <GtCenterBar
      :elapsed-sec="elapsed"
      :paused="paused"
      :alive-count="alivePlayers.length"
      :total-count="players.length"
      :game-ended="gameEnded"
      @pause="paused = !paused"
      @menu="activeSheet = 'menu'"
    />

    <!-- Bottom bank (normal orientation) -->
    <div
      v-if="banks[1]"
      class="flex-1 grid min-h-0 gap-2"
      :style="{ gridTemplateColumns: `repeat(${banks[1].length}, 1fr)` }"
    >
      <GtPlayerTile
        v-for="p in banks[1]"
        :key="p.seatIdx"
        :player="p"
        :rotated="false"
        :is-winner="winner?.seatIdx === p.seatIdx"
        :game-ended="gameEnded"
        :now-sec="elapsed"
        @life-change="(d) => onLife(p.seatIdx, d)"
        @poison-click="onPoison(p.seatIdx)"
        @cmdr-dmg-click="openCmdrDmg(p.seatIdx)"
        @manual-death="openManualDeath(p.seatIdx)"
        @concede="openConcede(p.seatIdx)"
      />
    </div>

    <!-- ── Sheets ───────────────────────────────────────────────────────────── -->

    <GtCmdrDmgSheet
      :open="activeSheet === 'cmdrDmg'"
      :target="activePlayer"
      :players="players"
      @close="closeSheet"
      @change="(attacker, dmg) => onCmdrDmg(activeSeatIdx, attacker, dmg)"
    />

    <GtManualDeathSheet
      :open="activeSheet === 'manualDeath'"
      :player="activePlayer"
      :now-sec="elapsed"
      @close="closeSheet"
      @confirm="() => { onManualDeath(activeSeatIdx); closeSheet() }"
    />

    <GtConcedeSheet
      :open="['concede', 'retire', 'cancel'].includes(activeSheet)"
      :mode="concedeMode"
      :player="activePlayer"
      @close="closeSheet"
      @confirm="onConcedeConfirm"
    />

    <GtGameMenu
      :open="activeSheet === 'menu'"
      :alive-count="alivePlayers.length"
      :art-credits="artCredits"
      @close="closeSheet"
      @end-game="onEndGame"
      @retire-game="onRetireGame"
      @cancel-game="onCancelGame"
    />
  </div>
</template>
