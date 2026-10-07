<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GsBottomSheet from './GsBottomSheet.vue'
import GsDeckOption from './GsDeckOption.vue'
import { deckChoicesForSeat } from '@/lib/game-setup'
import type { GsSeat, GsPod, GsDeck } from '@/lib/game-setup'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  seat: GsSeat | null
  pod: GsPod
  decks: GsDeck[]
  currentDeckId: string | null
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  pick: [deckId: string]
}>()

const player = computed(() =>
  props.seat && !props.seat.isGuest && props.seat.playerId
    ? props.pod.members.find(m => m.id === props.seat!.playerId)
    : undefined,
)

const playerLabel = computed(() =>
  props.seat?.isGuest
    ? (props.seat.guestName || t('game.seatCard.guestFallback'))
    : player.value?.name,
)

const sheetTitle = computed(() =>
  playerLabel.value ? t('game.deckSheet.pickDeckFor', { name: playerLabel.value }) : t('game.deckSheet.pickDeck'),
)

const choices = computed(() => deckChoicesForSeat(props.decks, props.pod.members, props.seat))
</script>

<template>
  <GsBottomSheet :open="open" :title="sheetTitle" @close="emit('close')">

    <div class="text-[11.5px] text-fg-2 leading-normal mb-3">
      <i18n-t keypath="game.deckSheet.intro" tag="span">
        <template #name>
          <span class="text-fg-1 font-semibold">{{ playerLabel || t('game.deckSheet.thisPlayer') }}</span>
        </template>
        <template #borrowed>
          <span class="text-tide-2 font-semibold">{{ t('game.deckSheet.borrowed') }}</span>
        </template>
      </i18n-t>
    </div>

    <div class="max-h-90 overflow-y-auto flex flex-col gap-3 pr-0.5">
      <!-- Own decks -->
      <div v-if="choices.own.length">
        <div class="text-eyebrow-label mb-2">{{ t('game.deckSheet.ownDecks', { name: player?.name }) }}</div>
        <div class="flex flex-col gap-1.5">
          <GsDeckOption
            v-for="deck in choices.own"
            :key="deck.id"
            :deck="deck"
            :selected="deck.id === currentDeckId"
            :borrowed="false"
            @pick="emit('pick', deck.id)"
          />
        </div>
      </div>

      <!-- Borrow from the pod, grouped by owner -->
      <div v-if="choices.borrowed.length" class="flex flex-col gap-3">
        <div class="text-eyebrow-label text-tide-2">{{ t('game.deckSheet.borrowFromPod') }}</div>
        <div v-for="group in choices.borrowed" :key="group.owner.id">
          <div class="text-eyebrow-label mb-2">{{ t('game.deckSheet.ownDecks', { name: group.owner.name }) }}</div>
          <div class="flex flex-col gap-1.5">
            <GsDeckOption
              v-for="deck in group.decks"
              :key="deck.id"
              :deck="deck"
              :selected="deck.id === currentDeckId"
              :borrowed="true"
              @pick="emit('pick', deck.id)"
            />
          </div>
        </div>
      </div>

      <!-- Empty / error state -->
      <div
        v-if="choices.own.length === 0 && choices.borrowed.length === 0"
        class="py-6 px-3 text-center text-[12.5px] leading-normal"
        :class="error ? 'text-danger' : 'text-fg-3'"
      >
        {{ error ? t('game.deckSheet.loadError') : t('game.deckSheet.empty') }}
      </div>
    </div>

  </GsBottomSheet>
</template>
