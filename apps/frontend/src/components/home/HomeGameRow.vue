<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SbAvatar from '@/components/ui/SbAvatar.vue'

const props = defineProps<{
  gameId: string
  winner: string
  deck: string
  when: string
  currentUser: string
  isLast?: boolean
}>()

defineEmits<{ open: [] }>()

const { t } = useI18n()

const wonByYou = computed(() => props.winner === props.currentUser)
</script>

<template>
  <div
    class="flex items-center gap-3.5 py-3.5 cursor-pointer active:opacity-70 transition-opacity duration-100"
    :class="{ 'border-b border-hairline': !isLast }"
    @click="$emit('open')"
  >
    <SbAvatar :name="winner" :size="34" :you="wonByYou" />
    <div class="flex-1 min-w-0">
      <div class="flex gap-1 items-center">
        <span class="font-bold text-[13.5px] text-fg-0">{{ wonByYou ? t('home.gameRow.you') : winner }}</span>
        <span class="text-[12.5px] text-fg-3">{{ wonByYou ? t('home.gameRow.youWonWith') : t('home.gameRow.wonWith') }}</span>
      </div>
      <div class="text-[12.5px] text-fg-2 italic truncate mt-0.5">{{ deck }}</div>
    </div>
    <div class="font-mono text-[11px] text-fg-3 shrink-0">{{ when }}</div>
  </div>
</template>
