<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { retireReasonKeys } from '@/lib/game-recap'

const props = defineProps<{
  reasons: string[]
  notes: string | null
}>()

const { t } = useI18n()
const headingId = useId()

const labels = computed(() => retireReasonKeys(props.reasons).map(key => t(key)))
</script>

<template>
  <section :aria-labelledby="headingId" class="mx-5 mb-5">
    <h2 :id="headingId" class="text-[10px] text-fg-3 uppercase tracking-widest font-semibold mb-3">
      {{ t('game.recap.retireTitle') }}
    </h2>
    <div class="card-surface p-4">
      <ul v-if="labels.length" class="flex flex-wrap gap-1.5" :class="notes && 'mb-3'">
        <li
          v-for="label in labels"
          :key="label"
          class="rounded-full bg-crown/12 border border-crown/30 text-crown px-2.5 py-1 text-[11.5px] font-semibold"
        >
          {{ label }}
        </li>
      </ul>
      <!-- Plain-text interpolation only, never v-html -->
      <blockquote
        v-if="notes"
        :aria-label="t('game.recap.retireNotes')"
        class="rounded-xl bg-bg-2 px-3 py-2 text-[12.5px] leading-snug text-fg-1 whitespace-pre-line wrap-break-word"
      >{{ notes }}</blockquote>
    </div>
  </section>
</template>
