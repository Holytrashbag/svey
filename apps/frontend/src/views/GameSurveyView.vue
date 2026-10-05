<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SbButton from '@/components/ui/SbButton.vue'
import SbBadge from '@/components/ui/SbBadge.vue'
import SbAvatar from '@/components/ui/SbAvatar.vue'
import { RESULT_KEY, SESSION_KEY } from '@/lib/game-tracker'
import type { GameResultData, GameSessionData, DeathCause } from '@/lib/game-tracker'
import { useGameStore } from '@/stores/useGameStore'
import type { CreateGameBody, CreateGamePlayer } from '@/types/api'

const router    = useRouter()
const gameStore = useGameStore()
const { t }     = useI18n()

type SurveyDraft = {
  playerIdx: number
  funRating: number | null
  agencyRating: number | null
  takeaway: string
  skipped: boolean
}

const result       = ref<GameResultData | null>(null)
const session      = ref<GameSessionData | null>(null)
const currentIdx   = ref(0)
const responses    = ref<SurveyDraft[]>([])
const funRating    = ref<number | null>(null)
const agencyRating = ref<number | null>(null)
const takeaway     = ref('')
const isSubmitting = ref(false)

onMounted(() => {
  const raw    = localStorage.getItem(RESULT_KEY)
  const rawSes = localStorage.getItem(SESSION_KEY)
  if (!raw || !rawSes) { void router.replace('/home'); return }
  result.value  = JSON.parse(raw) as GameResultData
  session.value = JSON.parse(rawSes) as GameSessionData
})

const currentPlayer = computed(() => result.value?.players[currentIdx.value] ?? null)
const isLast = computed(() => result.value ? currentIdx.value === result.value.players.length - 1 : false)
const progress = computed(() =>
  result.value ? t('game.survey.progress', { current: currentIdx.value + 1, total: result.value.players.length }) : '',
)

function isWinner(idx: number): boolean {
  if (!result.value || result.value.endReason !== 'won') return false
  const alive = result.value.players.filter(p => !p.dead)
  return alive.length === 1 && alive[0]?.seatIdx === result.value.players[idx]?.seatIdx
}

function mapDeathCause(cause: DeathCause | null): CreateGamePlayer['deathCause'] {
  switch (cause) {
    case 'life':    return 'life'
    case 'cmdr':    return 'cmdr_dmg'
    case 'poison':  return 'poison'
    case 'manual':  return 'special'
    case 'concede': return 'conceded'
    default:        return 'none'
  }
}

function resetForm() {
  funRating.value    = null
  agencyRating.value = null
  takeaway.value     = ''
}

function pushDraft(skipped: boolean) {
  responses.value.push({
    playerIdx:    currentIdx.value,
    funRating:    skipped ? null : funRating.value,
    agencyRating: skipped ? null : agencyRating.value,
    takeaway:     skipped ? '' : takeaway.value.trim(),
    skipped,
  })
}

function onNext(skipped: boolean) {
  pushDraft(skipped)
  currentIdx.value++
  resetForm()
}

async function onFinish(skipped: boolean) {
  if (!result.value || !session.value || isSubmitting.value) return
  pushDraft(skipped)
  isSubmitting.value = true

  const body: CreateGameBody = {
    podId:       result.value.podId,
    durationSec: result.value.durationSec,
    endReason:   result.value.endReason,
    abandonReasons: result.value.abandonReasons,
    players:     result.value.players.map((p, i) => {
      const seat  = session.value!.seats[p.seatIdx]!
      const draft = responses.value.find(r => r.playerIdx === i)
      return {
        name:           p.name,
        isGuest:        p.isGuest,
        memberId:       seat.playerId,
        deckId:         p.deck?.id ?? '',
        finalLife:      p.life,
        poison:         p.poison,
        deathCause:     mapDeathCause(p.deathCause),
        deathAt:        p.deathAt,
        isWinner:       isWinner(i),
        surveyFun:      draft?.funRating ?? null,
        surveyAgency:   draft?.agencyRating ?? null,
        surveyTakeaway: draft?.takeaway ?? '',
      }
    }),
  }

  try {
    const gameId = await gameStore.createGame(body)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(RESULT_KEY)
    await router.replace('/home')
    void router.push(`/games/${gameId}`)
  } catch {
    isSubmitting.value = false
  }
}

function onAbandon() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(RESULT_KEY)
  void router.replace('/home')
}
</script>

<template>
  <div v-if="result && currentPlayer" class="absolute inset-0 bg-bg-0 text-fg-0 flex flex-col overflow-hidden">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-safe-top" style="padding-top: max(env(safe-area-inset-top), 16px); padding-bottom: 12px;">
      <button
        class="w-9 h-9 rounded-xl bg-bg-2 flex items-center justify-center text-fg-2 text-lg transition-all duration-160 active:scale-[0.93] hover:bg-bg-3"
        :aria-label="t('common.close')"
        @click="onAbandon"
      >
        ×
      </button>
      <span class="font-display font-bold text-base tracking-tight">{{ t('game.survey.title') }}</span>
      <span class="text-fg-3 text-sm font-semibold tabular-nums">{{ progress }}</span>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 pb-6">

      <!-- Player intro -->
      <div class="flex flex-col items-center pt-6 pb-8 gap-3">
        <SbAvatar :name="currentPlayer.name" :size="56" />
        <div class="text-center">
          <div class="font-display font-bold" style="font-size: 22px; letter-spacing: -0.025em;">
            {{ t('game.survey.howFelt', { name: currentPlayer.name }) }}
          </div>
          <div v-if="isWinner(currentIdx)" class="flex justify-center mt-2">
            <SbBadge variant="win">{{ t('game.survey.winner') }}</SbBadge>
          </div>
          <div v-else-if="currentPlayer.dead" class="text-fg-3 text-sm mt-1">
            {{ t('game.survey.eliminated') }}
          </div>
        </div>
      </div>

      <!-- Fun rating -->
      <div class="mb-6">
        <div class="text-eyebrow font-bold uppercase tracking-[0.10em] text-fg-3 mb-3">
          {{ t('game.survey.funQuestion') }}
        </div>
        <div class="flex gap-2">
          <button
            v-for="n in 5"
            :key="n"
            class="flex-1 h-11 rounded-xl font-bold text-sm transition-all duration-160 active:scale-[0.95]"
            :class="funRating === n
              ? 'text-fg-0 border border-[rgba(167,139,250,0.55)] bg-[rgba(139,92,246,0.20)]'
              : 'bg-bg-2 text-fg-2 border border-transparent hover:bg-bg-3'"
            @click="funRating = n"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Agency rating -->
      <div class="mb-6">
        <div class="text-eyebrow font-bold uppercase tracking-[0.10em] text-fg-3 mb-3">
          {{ t('game.survey.agencyQuestion') }}
        </div>
        <div class="flex gap-2">
          <button
            v-for="n in 5"
            :key="n"
            class="flex-1 h-11 rounded-xl font-bold text-sm transition-all duration-160 active:scale-[0.95]"
            :class="agencyRating === n
              ? 'text-fg-0 border border-[rgba(167,139,250,0.55)] bg-[rgba(139,92,246,0.20)]'
              : 'bg-bg-2 text-fg-2 border border-transparent hover:bg-bg-3'"
            @click="agencyRating = n"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Free text -->
      <div class="mb-2">
        <div class="text-eyebrow font-bold uppercase tracking-[0.10em] text-fg-3 mb-3">
          {{ t('game.survey.addQuestion') }} <span class="normal-case font-normal tracking-normal">{{ t('game.survey.optional') }}</span>
        </div>
        <textarea
          v-model="takeaway"
          rows="3"
          :placeholder="t('game.survey.takeawayPlaceholder')"
          class="w-full rounded-xl bg-bg-1 border border-white/8 text-fg-0 placeholder-fg-4 resize-none px-4 py-3 text-sm font-body outline-none focus:border-arcane/50 transition-colors duration-160"
        />
      </div>

      <!-- Error -->
      <div v-if="gameStore.createError" class="mt-2 text-danger text-sm text-center">
        {{ gameStore.createError }}
      </div>

    </div>

    <!-- Footer -->
    <div
      class="px-5 pb-safe-bottom flex gap-2"
      style="padding-bottom: max(env(safe-area-inset-bottom), 20px); padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);"
    >
      <SbButton
        variant="secondary"
        size="lg"
        class="flex-1"
        :disabled="isSubmitting"
        @click="isLast ? onFinish(true) : onNext(true)"
      >
        {{ t('game.survey.skip') }}
      </SbButton>
      <SbButton
        variant="primary"
        size="lg"
        class="flex-2"
        :disabled="isSubmitting"
        @click="isLast ? onFinish(false) : onNext(false)"
      >
        {{ isSubmitting ? t('game.survey.saving') : isLast ? t('game.survey.finish') : t('game.survey.nextPlayer') }}
      </SbButton>
    </div>

  </div>
</template>
