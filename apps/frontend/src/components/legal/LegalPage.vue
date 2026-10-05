<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'

defineProps<{
  title: string
  /** Last-updated date, shown under the title (e.g. "10. Juni 2026"). */
  updated?: string
  /** Show the "draft / not yet legally reviewed" banner. */
  draft?: boolean
}>()

const router = useRouter()
const { t, locale } = useI18n()

function goBack() {
  // Deep-links land here with no in-app history; fall back to the auth screen.
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <div class="h-screen bg-bg-0 text-fg-0 overflow-hidden flex flex-col">
    <!-- iOS status bar spacer -->
    <div class="shrink-0 h-11" />

    <!-- ── Top bar ─────────────────────────────────────────── -->
    <div class="shrink-0 z-10 py-3 px-4 grid grid-cols-[36px_1fr_36px] items-center bg-scrim backdrop-blur-[20px] backdrop-saturate-140 border-b border-divider">
      <button
        class="flex items-center justify-center cursor-pointer w-9 h-9 rounded-full bg-overlay-1 border border-divider text-fg-1"
        :aria-label="t('common.back')"
        @click="goBack"
      >
        <SbIcon name="back" :size="16" :stroke="2.2" />
      </button>
      <div class="text-center font-display font-bold text-fg-0 text-[16px] tracking-[-0.01em]">{{ title }}</div>
      <div />
    </div>

    <!-- ── Scrollable content ──────────────────────────────── -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden">
      <div class="px-5 pt-6 pb-24 max-w-prose mx-auto">
        <h1 class="font-display font-bold text-fg-0 text-[26px] tracking-headline leading-[1.1]">{{ title }}</h1>
        <p v-if="updated" class="text-caption text-fg-3 mt-1.5">{{ t('legal.updated', { date: updated }) }}</p>

        <!-- Legal texts are German-only: the German version is the binding one. -->
        <p v-if="locale !== 'de'" class="mt-3 text-caption text-fg-2 leading-relaxed">
          {{ t('legal.germanOnly') }}
        </p>

        <!-- Draft notice: remove the `draft` prop once a lawyer has signed off. -->
        <div
          v-if="draft"
          class="mt-4 rounded-xl border border-crown/30 bg-crown/10 px-4 py-3 text-caption text-fg-1 leading-relaxed"
        >
          <strong class="text-crown font-semibold">{{ t('legal.draft.title') }}</strong>
          <i18n-t keypath="legal.draft.body" tag="span" scope="global">
            <template #placeholder><code class="text-fg-2">[…]</code></template>
          </i18n-t>
        </div>

        <!-- Prose: child elements styled here so views stay clean semantic HTML. -->
        <div
          class="mt-6
            [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-fg-0 [&_h2]:text-[17px] [&_h2]:mt-8 [&_h2]:mb-2
            [&_h3]:font-semibold [&_h3]:text-fg-1 [&_h3]:text-body-sm [&_h3]:mt-5 [&_h3]:mb-1.5
            [&_p]:text-body-sm [&_p]:text-fg-2 [&_p]:leading-relaxed [&_p]:mb-3
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1.5
            [&_li]:text-body-sm [&_li]:text-fg-2 [&_li]:leading-relaxed
            [&_a]:text-arcane-2 [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:text-fg-1 [&_strong]:font-semibold
            [&_address]:not-italic [&_address]:text-body-sm [&_address]:text-fg-1 [&_address]:leading-relaxed"
        >
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
