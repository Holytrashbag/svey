<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import PodMemberStack from './PodMemberStack.vue'
import type { PodMember } from './PodMemberStack.vue'

export interface SwitcherPlaygroup {
  id: string
  name: string
  members: PodMember[]
  games: number
  lastPlayedRelative: string
}

defineProps<{
  open: boolean
  playgroups: SwitcherPlaygroup[]
  currentId: string
}>()

const emit = defineEmits<{
  pick: [id: string]
  close: []
  create: []
}>()

const { t } = useI18n()
</script>

<template>
  <!-- Scrim -->
  <div
    class="fixed inset-0 z-30 transition-[background] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :class="open ? 'bg-scrim pointer-events-auto backdrop-blur-[2px]' : 'bg-transparent pointer-events-none'"
    @click="emit('close')"
  />

  <!-- Sheet -->
  <div
    class="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t border-white/10 bg-bg-1/92 backdrop-blur-[20px] backdrop-saturate-140 shadow-[0_-16px_40px_rgba(0,0,0,0.48)] pt-3 px-4 pb-7 transition-transform duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :inert="!open"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- Drag handle -->
    <div class="w-9 h-1 rounded-full mx-auto mb-3 bg-overlay-5" />

    <!-- Header -->
    <div class="flex items-baseline justify-between mb-3">
      <h2 class="text-stat font-display font-bold tracking-[-0.01em]">
        {{ t('home.switcher.title') }}
      </h2>
      <button
        class="bg-transparent border-0 text-arcane-2 text-body-sm font-semibold cursor-pointer p-1"
        @click="emit('close')"
      >{{ t('common.done') }}</button>
    </div>

    <!-- Playgroup list -->
    <div class="flex flex-col gap-2">
      <button
        v-for="p in playgroups"
        :key="p.id"
        class="flex items-center gap-3 p-3 rounded-lg cursor-pointer text-left font-body text-fg-0 border"
        :class="p.id === currentId
          ? 'bg-arcane/12 border-arcane/40'
          : 'bg-bg-2 border-divider'"
        @click="emit('pick', p.id)"
      >
        <PodMemberStack :members="p.members" :size="28" :max="3" />
        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-body-lg truncate tracking-[-0.01em]">{{ p.name }}</div>
          <div class="text-caption text-fg-2 mt-0.5">
            {{ t('home.switcher.players', p.members.length) }} · {{ t('home.switcher.games', p.games) }} · {{ p.lastPlayedRelative }}
          </div>
        </div>
        <div
          v-if="p.id === currentId"
          class="w-5.5 h-5.5 rounded-full bg-arcane flex items-center justify-center shrink-0"
        >
          <SbIcon name="check" :size="14" :stroke="2.6" color="#fff" />
        </div>
      </button>
    </div>

    <!-- Create / join -->
    <button
      class="mt-3.5 w-full h-11 bg-transparent text-arcane-2 font-semibold text-body cursor-pointer flex items-center justify-center gap-2 font-body rounded-lg border border-dashed border-overlay-4"
      @click="emit('create')"
    >
      <SbIcon name="plus" :size="16" :stroke="2.2" />
      {{ t('home.switcher.create') }}
    </button>
  </div>
</template>
