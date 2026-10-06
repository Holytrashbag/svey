<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbAvatar from '@/components/ui/SbAvatar.vue'
import SbIcon from '@/components/ui/SbIcon.vue'
import { formatWinRate } from '@/lib/pod-standings'

const { t } = useI18n()

const props = defineProps<{
  rank: number
  name: string
  wins: number
  winrate: number | null
  barWidth: number
  you?: boolean
  avatarUrl?: string | null
}>()

const isTop = props.rank === 1
</script>

<template>
  <div class="flex items-center gap-3 py-3 border-b border-hairline">
    <!-- Rank -->
    <div
      class="font-mono shrink-0 text-center w-5.5 text-caption font-semibold"
      :class="isTop ? 'text-crown' : 'text-fg-3'"
    >{{ rank }}</div>

    <!-- Avatar with crown badge for #1 -->
    <div class="relative shrink-0">
      <SbAvatar
        :name="name"
        :size="32"
        :tint="isTop ? 'crown' : undefined"
        :you="!isTop && you"
        :image-url="avatarUrl ?? undefined"
      />
      <div
        v-if="isTop"
        class="absolute flex items-center justify-center rounded-full -top-1 -left-1 w-4 h-4 bg-crown shadow-[0_0_0_2px_#06070D]"
      >
        <SbIcon name="crown" :size="9" color="#06070D" :stroke="2.6" />
      </div>
    </div>

    <!-- Name + win bar -->
    <div class="flex-1 min-w-0">
      <div class="font-display font-bold text-fg-0 text-body tracking-[-0.015em]">{{ you ? t('playgroups.youSuffix', { name }) : name }}</div>
      <div class="mt-1.5 h-1 rounded-full overflow-hidden bg-bg-2">
        <div
          class="h-full rounded-full"
          :class="isTop ? 'bg-crown' : 'bg-overlay-5'"
          :style="{ width: `${barWidth}%` }"
        />
      </div>
    </div>

    <!-- Wins + winrate -->
    <div class="text-right shrink-0">
      <div
        class="font-display font-bold text-[16px] tracking-tight tabular-nums"
        :class="isTop ? 'text-crown' : 'text-fg-0'"
      >
        {{ wins }}<span class="text-[10px] text-fg-3 font-medium ml-0.5">W</span>
      </div>
      <div class="font-mono text-[10.5px] text-fg-3 mt-0.5">{{ formatWinRate(winrate) }}</div>
    </div>
  </div>
</template>
