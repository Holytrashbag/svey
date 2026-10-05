<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import PodMemberStack from './PodMemberStack.vue'
import type { PodMember } from './PodMemberStack.vue'

const props = defineProps<{
  name: string
  members: PodMember[]
  lastPlayed: string
  multi: boolean
}>()

const emit = defineEmits<{
  openSwitcher: []
  startGame: []
}>()

const { t } = useI18n()

const onlineCount = computed(() => props.members.filter(m => m.online).length)
</script>

<template>
  <div class="mx-5 bg-bg-1 rounded-xl p-5 pb-4.5 relative overflow-hidden border border-arcane/22">
    <!-- Single arcane bloom — the only color note on the card -->
    <div
      aria-hidden="true"
      class="absolute -top-20 -right-16 w-55 h-55 pointer-events-none bg-[radial-gradient(circle,rgba(139,92,246,0.20),transparent_65%)]"
    />

    <!-- Switcher row -->
    <button
      class="flex items-center gap-1.5 bg-transparent border-0 p-0 m-0 text-left relative z-10"
      :class="multi ? 'cursor-pointer' : 'cursor-default'"
      @click="multi ? emit('openSwitcher') : undefined"
    >
      <div class="text-[10px] text-fg-2 uppercase tracking-eyebrow font-bold">{{ t('home.hero.activePlaygroup') }}</div>
      <SbIcon v-if="multi" name="chevron" :size="11" color="#8A88A3" :stroke="2.4" />
    </button>

    <!-- Playgroup name -->
    <div class="font-display font-bold text-fg-0 mt-2 relative z-10 text-display tracking-[-0.03em] leading-none">{{ name }}</div>

    <!-- Members + online status -->
    <div class="flex items-center gap-3 mt-4 relative z-10">
      <PodMemberStack :members="members" :size="28" ring-color="#0E1120" />
      <div class="text-[12.5px] text-fg-2 flex items-center gap-1.5">
        <span class="text-success font-semibold">{{ t('home.hero.online', { n: onlineCount }) }}</span>
        <span class="text-fg-4">·</span>
        <span>{{ t('home.lastPlayed', { when: lastPlayed }) }}</span>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="mt-5 relative z-10">
      <button
        class="w-full h-11.5 bg-arcane text-white border-0 rounded-xl font-bold text-body font-body cursor-pointer flex items-center justify-center gap-1.5 transition-transform duration-80 active:scale-[0.985] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
        @click="emit('startGame')"
      >
        <SbIcon name="plus" :size="18" :stroke="2.4" />
        {{ t('home.hero.startGame') }}
      </button>
    </div>
  </div>
</template>
