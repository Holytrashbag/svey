<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbAvatar from '@/components/ui/SbAvatar.vue'
import SbIcon from '@/components/ui/SbIcon.vue'

const { t } = useI18n()

defineProps<{
  name: string
  online: boolean
  role: 'admin' | 'member'
  mainDeck: string
  wins: number
  winrate: number
  threat: number
  you?: boolean
  canRemove?: boolean
  avatarUrl?: string | null
}>()

defineEmits<{
  remove: []
}>()
</script>

<template>
  <div class="flex items-center gap-3.5 p-4 border border-divider rounded-2xl">
    <!-- Avatar with online dot -->
    <div class="relative shrink-0">
      <SbAvatar :name="name" :size="44" :you="you" :image-url="avatarUrl ?? undefined" />
      <div
        v-if="online"
        class="absolute rounded-full bg-success bottom-0 right-0 w-3 h-3 shadow-[0_0_0_2px_#06070D]"
      />
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-display font-bold text-fg-0 text-[16px] tracking-tight">{{ you ? t('playgroups.youSuffix', { name }) : name }}</span>
        <span
          v-if="role === 'admin'"
          class="text-eyebrow text-crown tracking-wide uppercase font-bold py-0.5 px-1.5 bg-crown-wash-d rounded-md"
        >{{ t('playgroups.member.admin') }}</span>
      </div>
      <div class="italic truncate mt-0.5 text-[12.5px] text-fg-2">{{ mainDeck }}</div>
      <div class="flex items-center gap-2 mt-2">
        <span class="text-meta text-fg-3 tracking-wide uppercase font-semibold">{{ t('playgroups.member.threat') }}</span>
        <span class="font-mono font-semibold text-caption text-arcane-2">{{ threat.toFixed(1) }}</span>
      </div>
    </div>

    <!-- Wins + winrate -->
    <div class="text-right shrink-0">
      <div class="font-display font-bold text-fg-0 text-display-sm tracking-headline tabular-nums">
        {{ wins }}<span class="text-meta text-fg-3 font-medium ml-0.5">W</span>
      </div>
      <div class="font-mono text-meta text-fg-3 mt-0.5">{{ winrate }}%</div>
    </div>

    <!-- Remove button (admin only, non-self) -->
    <button
      v-if="canRemove"
      class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-transparent border-0 text-fg-3 hover:text-danger cursor-pointer transition-colors"
      @click.stop="$emit('remove')"
    >
      <SbIcon name="x" :size="16" />
    </button>
  </div>
</template>
