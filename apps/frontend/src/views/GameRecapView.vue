<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/composables/useNav'
import SbBottomNav from '@/components/ui/SbBottomNav.vue'
import SbAvatar from '@/components/ui/SbAvatar.vue'
import SbBadge from '@/components/ui/SbBadge.vue'
import SbIcon from '@/components/ui/SbIcon.vue'
import SbSpinner from '@/components/ui/SbSpinner.vue'
import { fmtClock } from '@/lib/game-tracker'
import { useFormat } from '@/composables/useFormat'
import { useGameStore } from '@/stores/useGameStore'

const { date: formatDate } = useFormat()
const { t } = useI18n()

// ─── Store + route ────────────────────────────────────────────────────────────

const store  = useGameStore()
const route  = useRoute()
const router = useRouter()
const gameId = route.params['id'] as string

onMounted(() => store.fetchGameDetail(gameId))

const recap = computed(() => store.activeGame)

// ─── Computed ──────────────────────────────────────────────────────────────────

const winner = computed(() => recap.value?.players.find(p => p.isWinner) ?? null)

const playedDate = computed(() => {
  if (!recap.value) return ''
  return formatDate(recap.value.playedAt)
})

const endReasonLabel = computed(() =>
  recap.value ? t(`game.recap.endReason.${recap.value.endReason}`) : '',
)

// Players sorted: eliminated by death time (earliest first), winner last
const sortedPlayers = computed(() => {
  if (!recap.value) return []
  return [...recap.value.players].sort((a, b) => {
    if (a.isWinner) return 1
    if (b.isWinner) return -1
    const aAt = a.deathAt ?? Infinity
    const bAt = b.deathAt ?? Infinity
    return aAt - bAt
  })
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DEATH_CAUSES = ['life', 'cmdr_dmg', 'poison', 'conceded', 'special']

function deathLabel(cause: string): string {
  if (cause === 'none') return ''
  return t(`game.recap.deathCause.${DEATH_CAUSES.includes(cause) ? cause : 'eliminated'}`)
}

// ─── Delete ────────────────────────────────────────────────────────────────────

const showDeleteConfirm = ref(false)
const isDeleting        = ref(false)

async function onDeleteConfirm() {
  isDeleting.value = true
  try {
    await store.deleteGame(gameId)
    router.back()
  } catch {
    isDeleting.value       = false
    showDeleteConfirm.value = false
  }
}

// ─── Navigation ────────────────────────────────────────────────────────────────

const { onNav } = useNav()
</script>

<template>
  <div class="relative h-screen bg-bg-0 text-fg-0 overflow-hidden">

    <!-- Floating back button -->
    <div class="absolute left-0 right-0 z-10 flex items-center justify-between top-13 px-4 pointer-events-none">
      <button
        class="flex items-center justify-center cursor-pointer border w-9 h-9 rounded-full bg-scrim-soft backdrop-blur-md border-overlay-2 text-fg-0 pointer-events-auto transition-all duration-160 active:scale-[0.92]"
        :aria-label="t('common.back')"
        @click="router.back()"
      >
        <SbIcon name="back" :size="18" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.detailLoading" class="flex items-center justify-center h-full">
      <SbSpinner />
    </div>

    <!-- Error -->
    <div v-else-if="store.detailError" class="flex items-center justify-center h-full px-8 text-center text-fg-3 text-body-sm">
      {{ store.detailError }}
    </div>

    <!-- Content -->
    <div v-else-if="recap" class="h-full overflow-y-auto overflow-x-hidden pt-13 pb-32">

      <!-- Hero -->
      <div class="px-5 pt-10 pb-7 flex flex-col items-center text-center gap-3">
        <div class="text-[10px] font-semibold uppercase tracking-[0.10em] text-fg-3">
          {{ recap.playgroup.name }} · {{ playedDate }}
        </div>

        <template v-if="recap.endReason === 'won' && winner">
          <SbAvatar :name="winner.name" :size="64" />
          <div>
            <div class="font-display font-bold text-display-sm tracking-tight leading-tight text-fg-0">
              {{ winner.name }}
            </div>
            <div class="text-fg-3 text-body-sm mt-0.5 italic truncate max-w-55">
              {{ winner.deck?.name ?? t('game.recap.noDeck') }}
            </div>
          </div>
          <SbBadge variant="win">{{ t('game.recap.winner') }}</SbBadge>
        </template>
        <template v-else-if="recap.endReason === 'draw'">
          <div class="font-display font-bold text-[26px] tracking-tight text-fg-2">{{ t('game.recap.draw') }}</div>
        </template>
        <template v-else>
          <div class="font-display font-bold text-[26px] tracking-tight text-fg-2">{{ t('game.recap.abandoned') }}</div>
        </template>
      </div>

      <!-- Stats strip -->
      <div class="mx-5 mb-5 card-surface grid grid-cols-3 divide-x divide-hairline">
        <div class="flex flex-col items-center py-4 gap-1">
          <div class="font-display font-bold text-display-sm tracking-tight text-fg-0">
            {{ recap.players.length }}
          </div>
          <div class="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-3">{{ t('game.recap.players') }}</div>
        </div>
        <div class="flex flex-col items-center py-4 gap-1">
          <div class="font-mono font-bold text-display-sm tracking-tight text-fg-0">
            {{ fmtClock(recap.durationSec) }}
          </div>
          <div class="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-3">{{ t('game.recap.duration') }}</div>
        </div>
        <div class="flex flex-col items-center py-4 gap-1">
          <div
            class="font-display font-bold text-display-sm tracking-tight"
            :class="recap.endReason === 'won' ? 'text-crown' : recap.endReason === 'draw' ? 'text-tide-2' : 'text-fg-3'"
          >
            {{ endReasonLabel }}
          </div>
          <div class="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-3">{{ t('game.recap.result') }}</div>
        </div>
      </div>

      <!-- Players -->
      <div class="mx-5 mb-5">
        <div class="text-[10px] text-fg-3 uppercase tracking-widest font-semibold mb-3">{{ t('game.recap.players') }}</div>
        <div class="card-surface overflow-hidden">
          <div
            v-for="(player, idx) in sortedPlayers"
            :key="player.name"
            class="flex items-center gap-3 px-4 py-3"
            :class="idx < sortedPlayers.length - 1 && 'border-b border-hairline'"
          >
            <SbAvatar :name="player.name" :size="34" />

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-[13.5px] text-fg-0">{{ player.name }}</span>
                <SbBadge v-if="player.isWinner" variant="win" class="text-eyebrow">{{ t('game.recap.won') }}</SbBadge>
              </div>
              <div class="text-caption text-fg-2 italic truncate mt-0.5">
                {{ player.deck?.name ?? t('game.recap.noDeck') }}
              </div>
            </div>

            <div class="text-right shrink-0">
              <template v-if="player.isWinner">
                <div class="text-meta text-crown font-semibold">{{ t('game.recap.life', { n: player.finalLife }) }}</div>
              </template>
              <template v-else>
                <div class="text-meta text-fg-2 font-medium">{{ deathLabel(player.deathCause) }}</div>
                <div v-if="player.deathAt != null" class="font-mono text-[10px] text-fg-4 mt-0.5">
                  @ {{ fmtClock(player.deathAt) }}
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Survey -->
      <div v-if="recap.survey && recap.survey.responseCount > 0" class="mx-5 mb-5">
        <div class="text-[10px] text-fg-3 uppercase tracking-widest font-semibold mb-3">
          {{ t('game.recap.howItFelt') }}
          <span class="normal-case tracking-normal font-normal text-fg-4 ml-1">
            {{ t('game.recap.responses', recap.survey.responseCount) }}
          </span>
        </div>
        <div class="card-surface grid grid-cols-2 divide-x divide-hairline">
          <div class="flex flex-col items-center py-5 gap-1">
            <div class="font-display font-bold text-[26px] tracking-tight text-arcane-2">
              {{ recap.survey.avgFun?.toFixed(1) ?? '—' }}
              <span class="text-fg-3 text-base font-medium ml-0.5">/5</span>
            </div>
            <div class="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-3">{{ t('game.recap.fun') }}</div>
          </div>
          <div class="flex flex-col items-center py-5 gap-1">
            <div class="font-display font-bold text-[26px] tracking-tight text-tide-2">
              {{ recap.survey.avgAgency?.toFixed(1) ?? '—' }}
              <span class="text-fg-3 text-base font-medium ml-0.5">/5</span>
            </div>
            <div class="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-3">{{ t('game.recap.agency') }}</div>
          </div>
        </div>
      </div>

      <!-- Delete error -->
      <div v-if="store.deleteError" class="mx-5 mb-3 text-danger text-sm text-center">
        {{ store.deleteError }}
      </div>

      <!-- Delete -->
      <div class="mx-5 mb-2">
        <template v-if="!showDeleteConfirm">
          <button
            class="w-full py-3 rounded-xl bg-danger/10 text-danger font-semibold text-[13.5px] border border-danger/20 cursor-pointer transition-all duration-160 active:scale-[0.98] hover:bg-danger/16"
            @click="showDeleteConfirm = true"
          >
            {{ t('game.recap.deleteGame') }}
          </button>
        </template>
        <template v-else>
          <div class="card-surface p-4">
            <div class="text-fg-0 font-semibold text-[13.5px] mb-1">{{ t('game.recap.deleteConfirmTitle') }}</div>
            <div class="text-fg-3 text-[12.5px] mb-4">{{ t('game.recap.deleteConfirmBody') }}</div>
            <div class="flex gap-2">
              <button
                class="flex-1 py-2.5 rounded-xl bg-bg-2 text-fg-2 font-semibold text-body-sm border-0 cursor-pointer transition-all duration-160 active:scale-[0.97]"
                :disabled="isDeleting"
                @click="showDeleteConfirm = false"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                class="flex-2 py-2.5 rounded-xl bg-danger/14 text-danger font-semibold text-body-sm border border-danger/25 cursor-pointer transition-all duration-160 active:scale-[0.97] disabled:opacity-50"
                :disabled="isDeleting"
                @click="onDeleteConfirm"
              >
                {{ isDeleting ? t('game.recap.deleting') : t('game.recap.yesDelete') }}
              </button>
            </div>
          </div>
        </template>
      </div>

    </div>

    <!-- Bottom nav -->
    <SbBottomNav active="pods" @change="onNav" />
  </div>
</template>
