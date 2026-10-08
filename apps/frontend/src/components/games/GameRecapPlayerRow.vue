<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbAvatar from '@/components/ui/SbAvatar.vue'
import SbBadge from '@/components/ui/SbBadge.vue'
import { fmtClock } from '@/lib/game-tracker'
import type { GameDetailPlayer } from '@/types/api'

defineProps<{
  player: GameDetailPlayer
  last: boolean
}>()

const { t } = useI18n()

const DEATH_CAUSES = ['life', 'cmdr_dmg', 'poison', 'conceded', 'special']

function deathLabel(cause: string): string {
  if (cause === 'none') return ''
  return t(`game.recap.deathCause.${DEATH_CAUSES.includes(cause) ? cause : 'eliminated'}`)
}
</script>

<template>
  <li class="px-4 py-3" :class="!last && 'border-b border-hairline'">
    <div class="flex items-center gap-3">
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

    <!-- Survey note: plain-text interpolation only, never v-html -->
    <blockquote
      v-if="player.note"
      class="mt-2 ml-11.5 rounded-xl bg-bg-2 px-3 py-2 text-[12.5px] leading-snug text-fg-1 whitespace-pre-line wrap-break-word"
    >{{ player.note }}</blockquote>
  </li>
</template>
