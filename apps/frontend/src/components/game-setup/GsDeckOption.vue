<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import { MANA, colorStripBg } from '@/lib/mtg'
import type { GsDeck } from '@/lib/game-setup'

const { t } = useI18n()

defineProps<{
  deck: GsDeck
  selected: boolean
  borrowed: boolean
}>()

const emit = defineEmits<{ pick: [] }>()
</script>

<template>
  <button
    type="button"
    class="flex items-stretch w-full text-left rounded-md cursor-pointer text-fg-0 overflow-hidden border transition-all duration-160 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :class="selected ? 'bg-arcane/10 border-arcane-edge' : 'bg-bg-0 border-divider'"
    @click="emit('pick')"
  >
    <div class="w-1 shrink-0">
      <div class="h-full" :style="{ background: colorStripBg(deck.colors, 'vertical') }" />
    </div>
    <div class="flex-1 min-w-0 py-2.5 px-3">
      <div class="flex items-center gap-1.5">
        <span class="font-body font-bold text-body text-fg-0 tracking-snug truncate">{{ deck.name }}</span>
        <span v-if="borrowed" class="tag-pill tag-pill--borrowed shrink-0">
          <SbIcon name="arrow" :size="8" :stroke="3" />
          {{ t('game.deckSheet.borrowedTag') }}
        </span>
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
        <template v-if="deck.commander">
          <span class="text-fg-4">·</span>
          <span class="text-fg-1 truncate">{{ deck.commander }}</span>
        </template>
      </div>
    </div>
    <div class="py-2.5 px-3 flex items-center">
      <div
        class="w-4.5 h-4.5 rounded-full shrink-0 flex items-center justify-center"
        :class="selected
          ? 'bg-arcane border-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)]'
          : 'bg-transparent border-[1.5px] border-overlay-4'"
      >
        <SbIcon v-if="selected" name="check" :size="10" color="#fff" :stroke="3" />
      </div>
    </div>
  </button>
</template>
