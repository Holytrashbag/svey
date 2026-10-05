<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PodMemberStack from '@/components/home/PodMemberStack.vue'
import type { PodMember } from '@/components/home/PodMemberStack.vue'

const { t } = useI18n()

defineProps<{
  invite: {
    name: string
    members: PodMember[]
    invitedBy: string
    games: number
  }
}>()

defineEmits<{ accept: []; decline: [] }>()
</script>

<template>
  <div class="relative overflow-hidden bg-bg-1 border border-arcane/30 rounded-2xl pt-4 pb-3.5 px-4">
    <!-- Arcane glow -->
    <div
      aria-hidden="true"
      class="absolute pointer-events-none -top-15 -right-10 w-40 h-40 bg-[radial-gradient(circle,rgba(139,92,246,0.20),transparent_65%)]"
    />

    <div class="relative z-10">
      <div class="inline-block font-bold text-[10px] text-arcane-2 tracking-eyebrow uppercase">{{ t('playgroups.invite.invited') }}</div>
      <div class="font-display font-bold text-fg-0 mt-1 text-stat tracking-tight leading-[1.15]">{{ invite.name }}</div>
      <div class="flex items-center gap-2 mt-2.5">
        <PodMemberStack :members="invite.members" :size="22" :max="4" ring-color="#0E1120" />
        <div class="text-caption text-fg-2">
          <span class="text-fg-1 font-semibold">{{ invite.invitedBy }}</span>
          <span class="text-fg-4 mx-1.5">·</span>
          {{ t('playgroups.players', invite.members.length) }}
          <span class="text-fg-4 mx-1.5">·</span>
          <span class="text-fg-3">{{ t('playgroups.gamesCount', invite.games) }}</span>
        </div>
      </div>
      <div class="flex gap-2 mt-3.5">
        <button
          class="flex-1 h-10 bg-arcane text-white border-0 font-bold font-body cursor-pointer text-body-sm rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          @click="$emit('accept')"
        >{{ t('playgroups.invite.accept') }}</button>
        <button
          class="h-10 bg-transparent text-fg-2 border border-white/10 font-semibold font-body cursor-pointer text-body-sm px-4 rounded-md"
          @click="$emit('decline')"
        >{{ t('playgroups.invite.decline') }}</button>
      </div>
    </div>
  </div>
</template>
