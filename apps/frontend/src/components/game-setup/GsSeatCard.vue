<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import { MANA, colorStripBg, deckIconBg } from '@/lib/mtg'
import { isBorrowedDeck } from '@/lib/game-setup'
import type { GsSeat, GsPod, GsDeck } from '@/lib/game-setup'

const { t } = useI18n()

const props = defineProps<{
  idx: number
  seat: GsSeat
  pod: GsPod
  decks: GsDeck[]
  span?: boolean
}>()

const emit = defineEmits<{
  pickPlayer: []
  pickDeck: []
  clear: []
}>()

const member = computed(() =>
  props.seat.playerId
    ? props.pod.members.find(m => m.id === props.seat.playerId)
    : undefined,
)

const isYou = computed(() => !!member.value?.you)
const isGuest = computed(() => props.seat.isGuest)
const filled = computed(() => !!(props.seat.playerId || props.seat.isGuest))

const name = computed(() => {
  if (isGuest.value) return props.seat.guestName || t('game.seatCard.guestFallback')
  return member.value?.name ?? null
})

const deck = computed(() => props.seat.deckId ? props.decks.find(d => d.id === props.seat.deckId) : undefined)

const deckOwner = computed(() =>
  deck.value ? props.pod.members.find(m => m.id === deck.value!.owner) : undefined,
)

const borrowed = computed(() => isBorrowedDeck(props.seat, deck.value))

const avatarTintClass = computed(() => {
  if (isGuest.value) return 'bg-[#3D2E10] text-crown'
  if (isYou.value) return 'bg-[#3A2B5C] text-arcane-soft'
  return 'bg-bg-3 text-[#A8AABF]'
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-[14px] min-h-38.5 flex flex-col"
    :class="[
      filled ? 'bg-bg-1 border border-overlay-2' : 'bg-transparent border border-dashed border-overlay-3',
      span ? 'col-span-2' : '',
    ]"
  >
    <!-- Color identity strip -->
    <div
      v-if="deck"
      class="absolute top-0 left-0 right-0"
    >
      <div class="h-0.75" :style="{ background: colorStripBg(deck.colors) }" />
    </div>

    <!-- Header: seat label + clear button -->
    <div class="flex items-center justify-between pt-2.5 px-2.5 shrink-0">
      <div
        class="inline-flex items-center gap-1.5"
        :class="filled ? 'text-fg-2' : 'text-fg-3'"
      >
        <div class="w-6 h-6 rounded-[7px] shrink-0 bg-bg-2 border border-divider text-fg-2 font-display font-bold text-caption flex items-center justify-center leading-none">{{ idx + 1 }}</div>
        <span class="text-[9.5px] font-bold tracking-eyebrow uppercase text-fg-3">{{ t('game.seatCard.seat') }}</span>
      </div>
      <button
        v-if="filled"
        class="w-6 h-6 rounded-full bg-overlay-1 border border-divider text-fg-3 flex items-center justify-center cursor-pointer p-0"
        :aria-label="t('game.seatCard.removePlayer')"
        @click.stop="emit('clear')"
      >
        <SbIcon name="x" :size="10" :stroke="2.4" />
      </button>
    </div>

    <!-- Player tap area -->
    <div
      role="button"
      tabindex="0"
      class="cursor-pointer flex items-center"
      :class="filled ? 'py-2 px-2.5 flex-none' : 'py-0 px-2.5 flex-1'"
      @click="emit('pickPlayer')"
      @keydown.enter="emit('pickPlayer')"
      @keydown.space.prevent="emit('pickPlayer')"
    >
      <!-- Filled: avatar + name -->
      <div v-if="filled" class="flex items-center gap-2.25 w-full min-w-0">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-body-sm shrink-0 border border-divider"
          :class="avatarTintClass"
        >{{ (name || '?').charAt(0).toUpperCase() }}</div>
        <div class="flex-1 min-w-0">
          <div class="font-body font-bold text-[14.5px] text-fg-0 tracking-[-0.01em] leading-[1.15] overflow-hidden text-ellipsis whitespace-nowrap">{{ name }}</div>
          <div v-if="isYou || isGuest" class="flex gap-1 mt-0.75">
            <span v-if="isYou" class="tag-pill tag-pill--you">{{ t('game.seatCard.you') }}</span>
            <span v-if="isGuest" class="tag-pill tag-pill--guest">{{ t('game.seatCard.guest') }}</span>
          </div>
        </div>
      </div>

      <!-- Empty: add player prompt -->
      <div
        v-else
        class="flex flex-col items-center justify-center gap-2 w-full py-3.5"
      >
        <div class="w-9.5 h-9.5 rounded-full bg-arcane-glow border border-dashed border-arcane-edge text-arcane-2 flex items-center justify-center">
          <SbIcon name="plus" :size="16" :stroke="2.4" />
        </div>
        <div class="font-body font-bold text-[12.5px] text-arcane-2 tracking-snug">{{ t('game.seatCard.addPlayer') }}</div>
        <div class="text-[10px] text-fg-3 leading-[1.3] text-center">
          {{ t('game.seatCard.orGuest') }}
        </div>
      </div>
    </div>

    <!-- Deck section (only when seated) -->
    <template v-if="filled">
      <div class="h-px bg-hairline mx-2.5 shrink-0" />

      <div
        role="button"
        tabindex="0"
        class="py-2.25 px-2.5 pb-2.5 cursor-pointer flex-1 flex flex-col justify-center min-h-0"
        @click="emit('pickDeck')"
        @keydown.enter="emit('pickDeck')"
        @keydown.space.prevent="emit('pickDeck')"
      >
        <!-- Deck chosen -->
        <template v-if="deck">
          <div class="flex items-start gap-2 min-w-0">
            <div
              class="w-7 h-7 rounded-[7px] shrink-0 relative overflow-hidden flex items-center justify-center mt-px"
              :style="{ background: deckIconBg(deck.colors) }"
            >
              <SbIcon name="decks" :size="13" color="#0b0915" :stroke="2.4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-body font-semibold text-[12.5px] text-fg-0 tracking-snug leading-tight line-clamp-2 wrap-break-word">{{ deck.name }}</div>
              <div class="flex items-center gap-1.25 text-[10.5px] text-fg-2 mt-0.75 font-mono font-semibold">
                <span>B{{ deck.bracket }}</span>
                <span class="text-fg-4">·</span>
                <div class="flex gap-0.5">
                  <div
                    v-for="c in deck.colors" :key="c"
                    class="w-2.25 h-2.25 rounded-full shrink-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.18)]"
                    :style="{ background: MANA[c]?.bg ?? '#888' }"
                  />
                </div>
              </div>
            </div>
          </div>
          <!-- Borrowed badge -->
          <div v-if="borrowed" class="mt-1.5">
            <span
              class="tag-pill tag-pill--borrowed"
              :title="t('game.seatCard.borrowedFrom', { name: deckOwner?.name ?? t('game.seatCard.borrowedFallback') })"
            >
              <SbIcon name="arrow" :size="8" :stroke="3" />
              {{ deckOwner?.name ?? t('game.seatCard.borrowedFallback') }}
            </span>
          </div>
        </template>

        <!-- No deck yet -->
        <div v-else class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-[7px] shrink-0 bg-bg-2 border border-dashed border-overlay-3 text-fg-3 flex items-center justify-center">
            <SbIcon name="decks" :size="13" :stroke="2" />
          </div>
          <div class="font-body font-bold text-[12.5px] text-arcane-2 tracking-snug inline-flex items-center gap-1">
            {{ t('game.seatCard.pickDeck') }}
            <SbIcon name="arrow" :size="11" :stroke="2.4" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
