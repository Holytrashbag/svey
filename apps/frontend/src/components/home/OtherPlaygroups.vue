<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PodMemberStack from './PodMemberStack.vue'
import type { PodMember } from './PodMemberStack.vue'

export interface OtherPlaygroup {
  id: string
  name: string
  members: PodMember[]
  lastPlayedRelative: string
}

defineProps<{ playgroups: OtherPlaygroup[] }>()
const emit = defineEmits<{ pick: [id: string] }>()

const { t } = useI18n()
</script>

<template>
  <div>
    <div class="px-5 pb-3.5 text-[10px] text-fg-3 uppercase tracking-eyebrow font-semibold">
      {{ t('home.otherPods') }}
    </div>
    <div class="flex gap-2.5 px-5 pb-1 overflow-x-auto scrollbar-none">
      <button
        v-for="p in playgroups"
        :key="p.id"
        class="flex-none w-50 bg-transparent border border-divider rounded-[14px] px-3.5 pt-3.5 pb-3 text-left cursor-pointer text-fg-0"
        @click="emit('pick', p.id)"
      >
        <div class="font-display font-bold text-body-lg truncate tracking-[-0.015em]">{{ p.name }}</div>
        <div class="flex items-center gap-2 mt-3">
          <PodMemberStack :members="p.members" :size="22" :max="3" ring-color="#06070D" />
          <div class="text-[11.5px] text-fg-3">{{ t('home.lastPlayed', { when: p.lastPlayedRelative }) }}</div>
        </div>
      </button>
    </div>
  </div>
</template>
