<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import GsBottomSheet from './GsBottomSheet.vue'
import type { GsPod, GsDeck } from '@/lib/game-setup'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  pod: GsPod
  decks: GsDeck[]
  takenIds: string[]
}>()

const emit = defineEmits<{
  close: []
  pick: [memberId: string]
  addGuest: [name: string]
}>()

const query = ref('')
const guestMode = ref(false)
const guestName = ref('')
const guestInputFocused = ref(false)

watch(() => props.open, (v) => {
  if (v) { query.value = ''; guestMode.value = false; guestName.value = '' }
})

const available = computed(() =>
  props.pod.members.filter(m =>
    m.name.toLowerCase().includes(query.value.toLowerCase()) &&
    !props.takenIds.includes(m.id),
  ),
)

const allTaken = computed(() =>
  props.pod.members.every(m => props.takenIds.includes(m.id)),
)

const sheetTitle = computed(() => guestMode.value ? t('game.playerSheet.addGuest') : t('game.playerSheet.pickPlayer'))
</script>

<template>
  <GsBottomSheet :open="open" :title="sheetTitle" @close="emit('close')">

    <!-- Player list mode -->
    <template v-if="!guestMode">

      <!-- Search input -->
      <div class="flex items-center gap-2 bg-bg-0 border border-overlay-2 rounded-lg px-3 h-11">
        <SbIcon name="search" :size="15" color="#5A586E" :stroke="2" />
        <input
          v-model="query"
          :placeholder="t('game.playerSheet.search', { pod: pod.name })"
          class="flex-1 bg-transparent border-0 outline-0 text-fg-0 font-body text-body"
        />
      </div>

      <!-- Member list -->
      <div class="mt-3.5 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
        <button
          v-for="m in available"
          :key="m.id"
          class="flex items-center gap-3 w-full text-left py-2.5 px-3 bg-bg-0 border border-divider rounded-md cursor-pointer text-fg-0"
          @click="emit('pick', m.id)"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-body-sm shrink-0 border border-divider"
            :class="m.you ? 'bg-[#3A2B5C] text-arcane-soft' : 'bg-bg-3 text-[#A8AABF]'"
          >
            {{ m.name.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-body">{{ m.name }}</span>
              <span v-if="m.you" class="tag-pill tag-pill--you">{{ t('game.seatCard.you') }}</span>
            </div>
            <div class="text-meta text-fg-2 mt-0.5">
              {{ t('game.playerSheet.deckCount', props.decks.filter(d => d.owner === m.id).length) }}
            </div>
          </div>
          <SbIcon name="chevron" :size="14" color="#5A586E" :stroke="2" />
        </button>

        <div
          v-if="available.length === 0 && allTaken"
          class="text-caption text-fg-3 py-1.5 px-1"
        >
          {{ t('game.playerSheet.everyoneSeated', { pod: pod.name }) }}
        </div>
      </div>

      <!-- Add guest CTA -->
      <button
        class="mt-3 w-full p-3 bg-transparent border border-dashed border-overlay-3 rounded-lg text-crown font-body text-body-sm font-bold cursor-pointer inline-flex items-center justify-center gap-2"
        @click="guestMode = true"
      >
        <SbIcon name="plus" :size="13" :stroke="2.4" />
        {{ t('game.playerSheet.addOneOff') }}
      </button>

    </template>

    <!-- Guest mode -->
    <template v-else>
      <div class="text-[12.5px] text-fg-2 leading-normal">
        {{ t('game.playerSheet.guestExplain') }}
      </div>

      <input
        v-model="guestName"
        :placeholder="t('game.playerSheet.guestNamePlaceholder')"
        autofocus
        class="w-full h-12 mt-3.5 px-3.5 bg-bg-0 border rounded-lg text-fg-0 font-body text-body-lg font-semibold outline-none box-border"
        :class="guestInputFocused ? 'border-arcane/55' : 'border-divider-strong'"
        @focus="guestInputFocused = true"
        @blur="guestInputFocused = false"
      />

      <div class="flex gap-2 mt-3">
        <button
          class="flex-1 h-11.5 bg-transparent text-fg-2 border border-divider-strong rounded-lg font-semibold text-body font-body cursor-pointer"
          @click="guestMode = false"
        >{{ t('game.playerSheet.back') }}</button>
        <button
          :disabled="guestName.trim().length < 1"
          class="flex-2 h-11.5 border-0 rounded-lg font-bold text-body font-body"
          :class="guestName.trim()
            ? 'bg-arcane text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
            : 'bg-bg-2 text-fg-3 cursor-not-allowed'"
          @click="() => { if (guestName.trim()) emit('addGuest', guestName.trim()) }"
        >{{ t('game.playerSheet.addGuestBtn') }}</button>
      </div>
    </template>

  </GsBottomSheet>
</template>
