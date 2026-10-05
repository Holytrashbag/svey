<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import GsBottomSheet from './GsBottomSheet.vue'
import { MANA, colorStripBg } from '@/lib/mtg'
import type { GsSeat, GsPod, GsDeck } from '@/lib/game-setup'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  seat: GsSeat | null
  pod: GsPod
  decks: GsDeck[]
  seatedPlayerIds: string[]
  currentDeckId: string | null
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

const allDecks = computed(() =>
  props.decks.filter(d => props.seatedPlayerIds.includes(d.owner)),
)

const ownDecks = computed(() =>
  player.value
    ? allDecks.value.filter(d => d.owner === player.value!.id)
    : [],
)

const borrowDecks = computed(() =>
  allDecks.value.filter(d => d.owner !== player.value?.id),
)

function ownerOf(deck: GsDeck) {
  return props.pod.members.find(m => m.id === deck.owner)
}
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
      <div v-if="ownDecks.length">
        <div class="text-eyebrow-label mb-2">{{ t('game.deckSheet.ownDecks', { name: player?.name }) }}</div>
        <div class="flex flex-col gap-1.5">
          <button
            v-for="deck in ownDecks"
            :key="deck.id"
            class="flex items-stretch w-full text-left rounded-md cursor-pointer text-fg-0 overflow-hidden border transition-all duration-160 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            :class="deck.id === currentDeckId
              ? 'bg-arcane/10 border-arcane-edge'
              : 'bg-bg-0 border-divider'"
            @click="emit('pick', deck.id)"
          >
            <div class="w-1 shrink-0">
              <div class="h-full" :style="{ background: colorStripBg(deck.colors, 'vertical') }" />
            </div>
            <div class="flex-1 min-w-0 py-2.5 px-3">
              <div class="flex items-center gap-1.5">
                <span class="font-body font-bold text-body text-fg-0 tracking-snug truncate">{{ deck.name }}</span>
              </div>
              <div class="flex items-center gap-1.5 text-meta text-fg-2 mt-0.75">
                <div class="flex gap-0.5">
                  <div
                    v-for="c in deck.colors" :key="c"
                    class="w-2.25 h-2.25 rounded-full shrink-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.18)]"
                    :style="{ background: MANA[c]?.bg ?? '#888' }"
                  />
                </div>
                <span>B{{ deck.bracket }}</span>
                <span class="text-fg-4">·</span>
                <span class="text-fg-1">{{ deck.archetype }}</span>
              </div>
            </div>
            <div class="py-2.5 px-3 flex items-center">
              <div
                class="w-4.5 h-4.5 rounded-full shrink-0 flex items-center justify-center"
                :class="deck.id === currentDeckId
                  ? 'bg-arcane border-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)]'
                  : 'bg-transparent border-[1.5px] border-overlay-4'"
              >
                <SbIcon v-if="deck.id === currentDeckId" name="check" :size="10" color="#fff" :stroke="3" />
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Borrow from table -->
      <div v-if="borrowDecks.length">
        <div class="text-eyebrow-label mb-2">{{ t('game.deckSheet.borrowFromTable') }}</div>
        <div class="flex flex-col gap-1.5">
          <button
            v-for="deck in borrowDecks"
            :key="deck.id"
            class="flex items-stretch w-full text-left rounded-md cursor-pointer text-fg-0 overflow-hidden border transition-all duration-160 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            :class="deck.id === currentDeckId
              ? 'bg-arcane/10 border-arcane-edge'
              : 'bg-bg-0 border-divider'"
            @click="emit('pick', deck.id)"
          >
            <div class="w-1 shrink-0">
              <div class="h-full" :style="{ background: colorStripBg(deck.colors, 'vertical') }" />
            </div>
            <div class="flex-1 min-w-0 py-2.5 px-3">
              <div class="flex items-center gap-1.5">
                <span class="font-body font-bold text-body text-fg-0 tracking-snug truncate">{{ deck.name }}</span>
                <span class="tag-pill tag-pill--borrowed shrink-0">{{ t('game.deckSheet.ownerSuffix', { name: ownerOf(deck)?.name }) }}</span>
              </div>
              <div class="flex items-center gap-1.5 text-meta text-fg-2 mt-0.75">
                <div class="flex gap-0.5">
                  <div
                    v-for="c in deck.colors" :key="c"
                    class="w-2.25 h-2.25 rounded-full shrink-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.18)]"
                    :style="{ background: MANA[c]?.bg ?? '#888' }"
                  />
                </div>
                <span>B{{ deck.bracket }}</span>
                <span class="text-fg-4">·</span>
                <span class="text-fg-1">{{ deck.archetype }}</span>
              </div>
            </div>
            <div class="py-2.5 px-3 flex items-center">
              <div
                class="w-4.5 h-4.5 rounded-full shrink-0 flex items-center justify-center"
                :class="deck.id === currentDeckId
                  ? 'bg-arcane border-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)]'
                  : 'bg-transparent border-[1.5px] border-overlay-4'"
              >
                <SbIcon v-if="deck.id === currentDeckId" name="check" :size="10" color="#fff" :stroke="3" />
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="ownDecks.length === 0 && borrowDecks.length === 0"
        class="py-6 px-3 text-center text-fg-3 text-[12.5px] leading-normal"
      >
        {{ t('game.deckSheet.empty') }}
      </div>
    </div>

  </GsBottomSheet>
</template>
