<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GtSheet from './GtSheet.vue'
import SbIcon from '@/components/ui/SbIcon.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    open: boolean
    aliveCount: number
    artCredits?: { name: string; artist: string }[]
  }>(),
  { artCredits: () => [] },
)

const emit = defineEmits<{
  close: []
  endGame: []
  retireGame: []
  cancelGame: []
}>()
</script>

<template>
  <GtSheet :open="open" :title="t('game.menu.title')" :subtitle="t('game.menu.subtitle')" @close="emit('close')">
    <div class="flex flex-col gap-2">

      <!-- End the game (only enabled when 1 player alive) -->
      <button
        class="grid items-center text-left rounded-[12px] border cursor-pointer transition-colors"
        style="grid-template-columns: auto 1fr auto; gap: 12px; padding: 12px 14px;"
        :style="{
          background: aliveCount > 1 ? '#181C30' : 'rgba(244,185,66,0.12)',
          borderColor: aliveCount > 1 ? 'rgba(255,255,255,0.06)' : 'rgba(244,185,66,0.40)',
          color: aliveCount > 1 ? '#5A586E' : '#F5F4FB',
          opacity: aliveCount > 1 ? 0.7 : 1,
          cursor: aliveCount > 1 ? 'not-allowed' : 'pointer',
        }"
        :disabled="aliveCount > 1"
        @click="aliveCount <= 1 && emit('endGame')"
      >
        <div
          class="w-7.5 h-7.5 rounded-[9px] flex items-center justify-center"
          :style="{
            background: aliveCount > 1 ? 'rgba(255,255,255,0.04)' : 'rgba(244,185,66,0.20)',
            color: aliveCount > 1 ? '#5A586E' : '#F4B942',
          }"
        >
          <SbIcon name="crown" :size="14" :stroke="2" />
        </div>
        <div>
          <div class="font-bold" style="font-size: 13.5px;">{{ t('game.menu.endGame') }}</div>
          <div class="text-fg-2" style="font-size: 11px; margin-top: 2px;">
            {{ aliveCount > 1
              ? t('game.menu.endGameAlive', { n: aliveCount })
              : t('game.menu.endGameReady') }}
          </div>
        </div>
        <SbIcon name="arrow" :size="14" :color="aliveCount > 1 ? '#3A3A4D' : '#F4B942'" :stroke="2" />
      </button>

      <!-- Retire game -->
      <button
        class="grid items-center text-left rounded-[12px] border cursor-pointer text-fg-0"
        style="grid-template-columns: auto 1fr auto; gap: 12px; padding: 12px 14px; background: #06070D; border-color: rgba(244,185,66,0.20);"
        @click="emit('retireGame')"
      >
        <div class="w-7.5 h-7.5 rounded-[9px] flex items-center justify-center" style="background: rgba(244,185,66,0.14); color: #F4B942;">
          <SbIcon name="timer" :size="14" :stroke="2" />
        </div>
        <div>
          <div class="font-bold" style="font-size: 13.5px;">{{ t('game.menu.retireGame') }}</div>
          <div class="text-fg-2" style="font-size: 11px; margin-top: 2px;">{{ t('game.menu.retireGameSub') }}</div>
        </div>
        <SbIcon name="arrow" :size="14" color="#F4B942" :stroke="2" />
      </button>

      <!-- Cancel game -->
      <button
        class="grid items-center text-left rounded-[12px] border cursor-pointer"
        style="grid-template-columns: auto 1fr auto; gap: 12px; padding: 12px 14px; background: #06070D; border-color: rgba(248,113,113,0.18); color: #F87171;"
        @click="emit('cancelGame')"
      >
        <div class="w-7.5 h-7.5 rounded-[9px] flex items-center justify-center" style="background: rgba(248,113,113,0.12); color: #F87171;">
          <SbIcon name="x" :size="14" :stroke="2.4" />
        </div>
        <div>
          <div class="font-bold" style="font-size: 13.5px;">{{ t('game.menu.cancelGame') }}</div>
          <div class="text-fg-2" style="font-size: 11px; margin-top: 2px;">{{ t('game.menu.cancelGameSub') }}</div>
        </div>
        <SbIcon name="arrow" :size="14" color="#F87171" :stroke="2" />
      </button>

      <!-- Card art credits (Scryfall requires the illustrator be identifiable) -->
      <div
        class="rounded-lg border px-3.5 py-3"
        style="margin-top: 4px; background: #06070D; border-color: rgba(255,255,255,0.06);"
      >
        <div class="text-fg-3 font-bold uppercase" style="font-size: 9.5px; letter-spacing: 0.10em;">{{ t('game.menu.cardArt') }}</div>
        <ul v-if="props.artCredits.length" class="mt-1.5 flex flex-col gap-0.5">
          <li v-for="c in props.artCredits" :key="c.name" class="text-fg-2" style="font-size: 10.5px;">
            {{ t('game.menu.illusBy', { name: c.name, artist: c.artist }) }}
          </li>
        </ul>
        <div class="text-fg-3 mt-1.5" style="font-size: 10px; line-height: 1.4;">
          {{ t('game.menu.artVia') }}
        </div>
      </div>

      <!-- Back -->
      <button
        class="rounded-lg border cursor-pointer font-body font-semibold text-fg-2"
        style="padding: 11px 14px; margin-top: 4px; background: transparent; border-color: rgba(255,255,255,0.10); font-size: 13px;"
        @click="emit('close')"
      >{{ t('game.menu.backToGame') }}</button>
    </div>
  </GtSheet>
</template>
