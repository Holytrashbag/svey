<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import GsSeatCard from '@/components/game-setup/GsSeatCard.vue'
import GsPlayerSheet from '@/components/game-setup/GsPlayerSheet.vue'
import GsDeckSheet from '@/components/game-setup/GsDeckSheet.vue'
import { MANA, AVATAR_ROLE } from '@/lib/mtg'
import { toGsDeck, isSeatFilled, buildSessionSeats } from '@/lib/game-setup'
import type { GsSeat, GsPod, GsDeck } from '@/lib/game-setup'
import { SESSION_KEY } from '@/lib/game-tracker'
import type { GameSessionData } from '@/lib/game-tracker'
import { usePlaygroupStore } from '@/stores/usePlaygroupStore'

// ── Route ──────────────────────────────────────────────────────────────────────

const router       = useRouter()
const route        = useRoute()
const podId        = route.params['id'] as string
const playgroupStore = usePlaygroupStore()
const { t } = useI18n()

onMounted(async () => {
  await Promise.all([
    playgroupStore.fetchPlaygroupDetail(podId),
    playgroupStore.fetchPodDecks(podId),
  ])
})

// ── Computed: real data mapped to game-setup shapes ────────────────────────────

const pod = computed<GsPod>(() => {
  const pg = playgroupStore.currentPlaygroup
  if (!pg) return { id: podId, name: '…', members: [] }
  return {
    id:      pg.id,
    name:    pg.name,
    members: pg.members.map(m => ({ id: m.id, name: m.name, you: m.you })),
  }
})

// Non-archived decks of every pod member; owner is the owning member's id
const setupDecks = computed<GsDeck[]>(() => playgroupStore.podDecks.map(toGsDeck))

// ── Seat state ─────────────────────────────────────────────────────────────────

const blank = (): GsSeat => ({ playerId: null, isGuest: false, guestName: '', deckId: null })

const seats = ref<GsSeat[]>([blank(), blank(), blank(), blank()])

const activeSheet    = ref<'none' | 'player' | 'deck'>('none')
const activeSeatIdx  = ref<number | null>(null)

// ── Computed: seat helpers ─────────────────────────────────────────────────────

const filledSeats   = computed(() => seats.value.filter(isSeatFilled))
const seatsWithDeck = computed(() => filledSeats.value.filter(s => s.deckId))
const canStart      = computed(() =>
  filledSeats.value.length >= 2 && seatsWithDeck.value.length === filledSeats.value.length,
)

const ctaLabel = computed(() => {
  if (canStart.value) return null
  if (filledSeats.value.length < 2) return t('game.setup.ctaSeat2')
  const missing = filledSeats.value.length - seatsWithDeck.value.length
  return t('game.setup.ctaPickDeck', { missing })
})

const takenIds = computed(() =>
  seats.value.map(s => s.playerId).filter(Boolean) as string[],
)


const activeSeat = computed(() =>
  activeSeatIdx.value != null ? (seats.value[activeSeatIdx.value] ?? null) : null,
)

// ── Computed: summary panel ────────────────────────────────────────────────────

const summaryDecks = computed(() =>
  seatsWithDeck.value
    .map(s => setupDecks.value.find(d => d.id === s.deckId))
    .filter((d): d is GsDeck => d != null),
)

const summaryBrackets = computed(() => summaryDecks.value.map(d => d.bracket))
const summaryMinB     = computed(() => summaryBrackets.value.length ? Math.min(...summaryBrackets.value) : null)
const summaryMaxB     = computed(() => summaryBrackets.value.length ? Math.max(...summaryBrackets.value) : null)
const summaryColors   = computed(() => {
  const seen = new Set<string>()
  summaryDecks.value.forEach(d => d.colors.forEach(c => seen.add(c)))
  return ['W', 'U', 'B', 'R', 'G'].filter(c => seen.has(c))
})

// ── Mini avatar helpers ────────────────────────────────────────────────────────

function miniAvatarTint(isYou: boolean, isGuest: boolean) {
  if (isGuest) return AVATAR_ROLE.crown
  if (isYou)   return AVATAR_ROLE.you
  return AVATAR_ROLE.default
}

function miniName(seat: GsSeat): string {
  if (seat.isGuest) return seat.guestName || t('game.setup.guestShort')
  return pod.value.members.find(m => m.id === seat.playerId)?.name ?? '?'
}

function miniIsYou(seat: GsSeat): boolean {
  return !!pod.value.members.find(m => m.id === seat.playerId)?.you
}

// ── Actions ────────────────────────────────────────────────────────────────────

function setSeatCount(n: number) {
  if (n > seats.value.length) {
    while (seats.value.length < n) seats.value.push(blank())
  } else {
    seats.value = seats.value.slice(0, n)
  }
}

function onPickPlayer(idx: number) {
  activeSeatIdx.value = idx
  activeSheet.value   = 'player'
}

function onPickDeck(idx: number) {
  activeSeatIdx.value = idx
  activeSheet.value   = 'deck'
}

function onClearSeat(idx: number) {
  seats.value[idx] = blank()
}

function onPlayerPicked(memberId: string) {
  if (activeSeatIdx.value == null) return
  seats.value[activeSeatIdx.value] = { playerId: memberId, isGuest: false, guestName: '', deckId: null }
  activeSheet.value = 'none'
}

function onGuestAdded(name: string) {
  if (activeSeatIdx.value == null) return
  seats.value[activeSeatIdx.value] = { playerId: null, isGuest: true, guestName: name, deckId: null }
  activeSheet.value = 'none'
}

function onDeckPicked(deckId: string) {
  if (activeSeatIdx.value == null) return
  seats.value[activeSeatIdx.value] = { ...seats.value[activeSeatIdx.value]!, deckId }
  activeSheet.value = 'none'
}

function startGame() {
  if (!canStart.value) return
  const session: GameSessionData = {
    podId,
    startLife: 40,
    seats: buildSessionSeats(seats.value, pod.value.members, setupDecks.value),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  router.push(`/pods/${podId}/game/tracker`)
}

const takenIdsForSheet = computed(() =>
  activeSeatIdx.value != null
    ? takenIds.value.filter(id => id !== seats.value[activeSeatIdx.value!]?.playerId)
    : takenIds.value,
)
</script>

<template>
  <div class="absolute inset-0 bg-bg-0 text-fg-0 flex flex-col overflow-hidden">
    <!-- iOS status bar spacer -->
    <div class="pt-11 shrink-0">

      <!-- Top bar -->
      <div class="sticky top-0 z-10 py-3 px-4 grid grid-cols-[36px_1fr_auto] items-center gap-2 bg-scrim backdrop-blur-[20px] backdrop-saturate-140 border-b border-divider">
        <button
          class="w-9 h-9 rounded-full bg-overlay-1 border border-divider text-fg-1 flex items-center justify-center cursor-pointer p-0"
          :aria-label="t('common.close')"
          @click="router.back()"
        >
          <SbIcon name="x" :size="16" :stroke="2.2" />
        </button>

        <div class="text-center font-display font-bold text-[16px] tracking-[-0.01em] text-fg-0">{{ t('game.setup.newGame') }}</div>

        <div class="inline-flex items-center gap-1.5 py-1.25 pl-1.75 pr-2.25 rounded-full bg-tide/10 border border-tide/18 text-tide-2 justify-self-end">
          <div class="w-1.5 h-1.5 rounded-full bg-tide-2" />
          <span class="text-[10.5px] font-bold tracking-[0.04em] uppercase">
            {{ t('game.setup.saved') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden">

      <!-- Hero -->
      <div class="pt-4.5 px-5">
        <!-- Pod chip -->
        <button class="inline-flex items-center gap-2 py-1.75 pl-2 pr-2.5 rounded-full bg-bg-1 border border-overlay-2 text-fg-1 font-body text-caption font-semibold cursor-pointer">
          <div class="w-4.5 h-4.5 rounded-md bg-tide/16 text-tide-2 flex items-center justify-center">
            <SbIcon name="pods" :size="11" :stroke="2.2" />
          </div>
          <span class="text-fg-3">{{ t('game.setup.from') }}</span>
          <span class="text-fg-0 font-bold">{{ pod.name }}</span>
          <SbIcon name="chevron" :size="11" color="#5A586E" :stroke="2" />
        </button>

        <h1 class="font-display font-bold text-display tracking-headline leading-[1.08] text-fg-0 mt-3.5 mb-1.5">{{ t('game.setup.setTheTable') }}</h1>
        <div class="text-[13.5px] text-fg-2 leading-snug">
          {{ t('game.setup.intro') }}
        </div>
      </div>

      <!-- Summary card -->
      <div class="mt-4.5 mx-5 p-3.5 bg-[linear-gradient(180deg,rgba(139,92,246,0.08),rgba(20,184,166,0.04)_70%,transparent)] border border-arcane/16 rounded-[14px] flex items-center gap-3.5">
        <div class="flex-1 min-w-0">
          <div class="text-[10px] font-bold tracking-eyebrow uppercase text-arcane-2">{{ t('game.setup.theTable') }}</div>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="font-display font-bold text-[24px] tracking-headline text-fg-0 leading-none">{{ filledSeats.length }}</span>
            <span class="text-caption text-fg-2">
              {{ t('game.setup.ofPlayers', { total: seats.length }) }}
            </span>
          </div>

          <div v-if="summaryBrackets.length" class="text-[11.5px] text-fg-2 mt-1.5 flex items-center gap-1.5">
            <SbIcon name="sparkle" :size="11" color="#F4B942" :stroke="2" />
            <template v-if="summaryMinB === summaryMaxB">
              {{ t('game.setup.podWide') }} <span class="text-crown font-bold ml-1">{{ t('game.setup.bracket', { n: summaryMinB }) }}</span>
            </template>
            <template v-else>
              {{ t('game.setup.bracketSpread') }} <span class="text-crown font-bold ml-1">{{ summaryMinB }}–{{ summaryMaxB }}</span>
            </template>
            <template v-if="summaryColors.length">
              <span class="text-fg-4 mx-0.5">·</span>
              <div class="flex gap-0.5">
                <div
                  v-for="c in summaryColors" :key="c"
                  class="w-2.25 h-2.25 rounded-full shrink-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.18)]"
                  :style="{ background: MANA[c]?.bg ?? '#888' }"
                />
              </div>
            </template>
          </div>
          <div v-else class="text-[11.5px] text-fg-3 mt-1.5">
            {{ t('game.setup.seatHint') }}
          </div>
        </div>

        <!-- Mini avatar stack -->
        <div class="flex shrink-0">
          <div
            v-for="(s, i) in filledSeats.slice(0, 4)"
            :key="i"
            class="rounded-full shadow-[0_0_0_2px_#0E1120]"
            :class="i !== 0 && '-ml-2'"
          >
            <div
              class="w-6.5 h-6.5 rounded-full flex items-center justify-center font-display font-bold text-meta border border-divider"
              :style="{
                background: miniAvatarTint(miniIsYou(s), s.isGuest).bg,
                color:      miniAvatarTint(miniIsYou(s), s.isGuest).fg,
              }"
            >{{ miniName(s).charAt(0).toUpperCase() }}</div>
          </div>
        </div>
      </div>

      <!-- Seats section header -->
      <div class="pt-6 px-5 pb-2 flex items-center justify-between gap-3">
        <div>
          <div class="text-eyebrow-label">{{ t('game.setup.seats') }}</div>
          <div class="text-[11.5px] text-fg-2 mt-0.75">
            {{ t('game.setup.filled', { filled: filledSeats.length, total: seats.length }) }}
          </div>
        </div>

        <!-- Seat stepper -->
        <div class="inline-flex items-center gap-0.5 bg-bg-1 border border-overlay-2 rounded-full p-0.75">
          <button
            class="w-7 h-7 rounded-full border-0 bg-transparent flex items-center justify-center p-0"
            :class="seats.length <= 2
              ? 'text-fg-4 cursor-not-allowed'
              : 'text-fg-1 cursor-pointer'"
            :disabled="seats.length <= 2"
            :aria-label="t('game.setup.removeSeat')"
            @click="seats.length > 2 && setSeatCount(seats.length - 1)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14" :stroke="seats.length <= 2 ? '#3A3A4D' : '#C4C1D8'" stroke-width="2.6" stroke-linecap="round" />
            </svg>
          </button>
          <div class="min-w-10 text-center font-display font-bold text-fg-0 text-body">
            {{ seats.length }}<span class="text-fg-3 font-medium ml-0.75">{{ t('game.setup.seatsCount') }}</span>
          </div>
          <button
            class="w-7 h-7 rounded-full border-0 flex items-center justify-center p-0"
            :class="seats.length >= 6
              ? 'bg-transparent text-fg-4 cursor-not-allowed'
              : 'bg-arcane/16 text-arcane-2 cursor-pointer'"
            :disabled="seats.length >= 6"
            :aria-label="t('game.setup.addSeat')"
            @click="seats.length < 6 && setSeatCount(seats.length + 1)"
          >
            <SbIcon name="plus" :size="12" :stroke="2.6" />
          </button>
        </div>
      </div>

      <!-- 2-column seat grid -->
      <div class="px-5 grid grid-cols-2 gap-2.5 items-stretch">
        <GsSeatCard
          v-for="(seat, i) in seats"
          :key="i"
          :idx="i"
          :seat="seat"
          :pod="pod"
          :decks="setupDecks"
          :span="(seats.length % 2 === 1) && (i === seats.length - 1)"
          @pick-player="onPickPlayer(i)"
          @pick-deck="onPickDeck(i)"
          @clear="onClearSeat(i)"
        />
      </div>

      <!-- Tip row -->
      <div class="pt-3.5 px-5">
        <div class="py-2.5 px-3 bg-tide/6 border border-tide/18 rounded-md flex items-start gap-2">
          <SbIcon name="sparkle" :size="13" color="#2DD4BF" :stroke="2" />
          <div class="text-[11.5px] text-fg-1 leading-normal">
            {{ t('game.setup.tip') }}
          </div>
        </div>
      </div>

      <!-- Bottom spacer (leaves room for sticky CTA) -->
      <div class="h-30" />
    </div>

    <!-- Sticky CTA -->
    <div class="absolute left-0 right-0 bottom-0 py-3 px-4 pb-7 bg-[linear-gradient(180deg,rgba(6,7,13,0)_0%,rgba(6,7,13,0.92)_30%,#06070D_70%)] pointer-events-none">
      <button
        class="w-full h-13.5 rounded-[14px] border-0 font-body font-bold text-body-lg tracking-snug inline-flex items-center justify-center gap-2 pointer-events-auto"
        :class="canStart
          ? 'bg-arcane text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
          : 'bg-bg-2 text-fg-3 cursor-not-allowed'"
        :disabled="!canStart"
        @click="startGame"
      >
        <template v-if="canStart">
          {{ t('game.setup.startGame') }}
          <SbIcon name="arrow" :size="17" :stroke="2.4" />
        </template>
        <template v-else>
          {{ ctaLabel }}
        </template>
      </button>
    </div>

    <!-- Player picker sheet -->
    <GsPlayerSheet
      :open="activeSheet === 'player'"
      :pod="pod"
      :decks="setupDecks"
      :taken-ids="takenIdsForSheet"
      @close="activeSheet = 'none'"
      @pick="onPlayerPicked"
      @add-guest="onGuestAdded"
    />

    <!-- Deck picker sheet -->
    <GsDeckSheet
      :open="activeSheet === 'deck'"
      :seat="activeSeat"
      :pod="pod"
      :decks="setupDecks"
      :error="playgroupStore.podDecksError"
      :current-deck-id="activeSeat?.deckId ?? null"
      @close="activeSheet = 'none'"
      @pick="onDeckPicked"
    />
  </div>
</template>
