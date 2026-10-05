<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PodMemberStack from '@/components/home/PodMemberStack.vue'
import type { PodMember } from '@/components/home/PodMemberStack.vue'
import SbIcon from '@/components/ui/SbIcon.vue'

const { t } = useI18n()

defineProps<{
  name: string
  founded: string
  members: PodMember[]
  role: 'admin' | 'member'
}>()

defineEmits<{ invite: []; settings: [] }>()
</script>

<template>
  <div class="mx-5 relative overflow-hidden bg-bg-1 border border-arcane/22 rounded-xl pt-5 pb-4.5 px-5">
    <!-- Arcane glow bloom -->
    <div
      aria-hidden="true"
      class="absolute pointer-events-none -top-20 -right-15 w-55 h-55 bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_65%)]"
    />

    <div class="relative z-1">
      <!-- Eyebrow -->
      <div class="font-semibold text-[10px] text-fg-3 tracking-eyebrow uppercase">{{ t('playgroups.hero.since', { date: founded }) }}</div>

      <!-- Playgroup name -->
      <div class="font-display font-bold text-fg-0 text-[30px] tracking-[-0.035em] leading-none mt-2">{{ name }}</div>

      <!-- Member stack + online count -->
      <div class="flex items-center gap-3 mt-4">
        <PodMemberStack :members="members" :size="28" ring-color="#0E1120" />
        <div class="flex items-center gap-1.5 text-[12.5px] text-fg-2">
          <span class="text-success font-semibold">
            {{ t('playgroups.online', { n: members.filter(m => m.online).length }) }}
          </span>
          <span class="text-fg-4">·</span>
          <span>{{ t('playgroups.players', members.length) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 mt-5">
        <button
          v-if="role === 'admin'"
          class="flex-1 h-11 flex items-center justify-center gap-1.5 border-0 font-bold font-body text-white cursor-pointer bg-arcane rounded-lg text-body shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          @click="$emit('invite')"
        >
          <SbIcon name="plus" :size="16" :stroke="2.4" />
          {{ t('playgroups.hero.invite') }}
        </button>
        <button
          class="h-11 flex items-center justify-center gap-1.5 border font-semibold font-body cursor-pointer shrink-0 px-4.5 bg-transparent text-fg-1 border-divider-strong rounded-lg text-body whitespace-nowrap"
          :class="role === 'admin' ? '' : 'flex-1'"
          @click="$emit('settings')"
        >
          <SbIcon name="settings" :size="14" />
          {{ t('playgroups.hero.settings') }}
        </button>
      </div>
    </div>
  </div>
</template>
