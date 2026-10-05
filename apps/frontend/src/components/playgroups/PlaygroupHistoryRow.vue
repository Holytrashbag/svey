<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbAvatar from '@/components/ui/SbAvatar.vue'

const { t } = useI18n()

defineProps<{
  gameId: string
  winnerName: string
  deck: string
  when: string
  duration: string
  wonByYou?: boolean
  isLast?: boolean
}>()

defineEmits<{ open: [] }>()
</script>

<template>
  <div
    class="flex items-center gap-3.5 py-3 cursor-pointer active:opacity-70 transition-opacity duration-100"
    :class="!isLast && 'border-b border-hairline'"
    @click="$emit('open')"
  >
    <SbAvatar :name="winnerName" :size="32" :you="wonByYou" />

    <div class="flex-1 min-w-0">
      <div class="flex gap-1 items-center">
        <span class="font-bold text-fg-0 text-[13.5px]">
          {{ wonByYou ? t('playgroups.you') : winnerName }}
        </span>
        <span class="text-[12.5px] text-fg-3">{{ t('playgroups.wonWith') }}</span>
      </div>
      <div class="italic truncate mt-0.5 text-[12.5px] text-fg-2">{{ deck }}</div>
    </div>

    <div class="text-right shrink-0">
      <div class="font-mono text-meta text-fg-2">{{ when }}</div>
      <div class="text-[10.5px] text-fg-4 mt-0.5">{{ duration }}</div>
    </div>
  </div>
</template>
