<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import { useDeckStore } from '@/stores/useDeckStore'

const router = useRouter()
const store = useDeckStore()
const { t } = useI18n()

// ── Static data ───────────────────────────────────────────────────────

const SERVICES = [
  { id: 'archidekt', name: 'Archidekt',  supported: true  },
  { id: 'moxfield',  name: 'Moxfield',   supported: false },
  { id: 'goldfish',  name: 'MTGGoldfish', supported: false },
  { id: 'tappedout', name: 'TappedOut',  supported: false },
]

// ── State ─────────────────────────────────────────────────────────────

const urlState    = ref<'empty' | 'fetching' | 'error'>('empty')
const urlValue    = ref('')

// ── Computed ──────────────────────────────────────────────────────────

const looksLikeUrl = computed(() =>
  /archidekt\.com/i.test(urlValue.value)
)

const detectedService = computed(() => {
  if (/archidekt\.com/i.test(urlValue.value)) return 'Archidekt'
  return null
})

// ── Methods ───────────────────────────────────────────────────────────

async function triggerParse() {
  if (!looksLikeUrl.value || urlState.value === 'fetching') return
  urlState.value = 'fetching'
  try {
    const id = await store.importDeck(urlValue.value)
    router.push(`/decks/${id}`)
  } catch {
    urlState.value = 'error'
  }
}

function clearUrl() {
  urlValue.value = ''
  urlState.value = 'empty'
}
</script>

<template>
  <div class="h-screen bg-bg-0 text-fg-0 overflow-hidden flex flex-col">

    <!-- iOS status bar simulation -->
    <div class="shrink-0 h-11" />

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden">

      <!-- ── Top bar ─────────────────────────────────────────── -->
      <div class="sticky top-0 z-10 py-3 px-4 grid grid-cols-[36px_1fr_36px] items-center bg-scrim backdrop-blur-[20px] backdrop-saturate-140 border-b border-divider">
        <button
          class="flex items-center justify-center cursor-pointer w-9 h-9 rounded-full bg-overlay-1 border border-divider text-fg-1"
          @click="router.back()"
        >
          <SbIcon name="x" :size="16" :stroke="2.2" />
        </button>
        <div class="text-center font-display font-bold text-fg-0 text-[16px] tracking-[-0.01em]">{{ t('decks.add.importDeck') }}</div>
        <div />
      </div>

      <!-- ── URL input ───────────────────────────────────────── -->
      <div class="pt-5 px-5">

        <div class="text-eyebrow-label mb-2">{{ t('decks.add.archidektUrl') }}</div>

        <div
          class="flex items-center rounded-lg pl-3.5 pr-1.5 h-13 gap-2 bg-bg-1 transition-[border-color] duration-160 ease-linear border"
          :class="urlState === 'error' ? 'border-danger/45' : 'border-divider-strong'"
        >
          <SbIcon name="arrow" :size="15" :stroke="2" :color="looksLikeUrl ? '#A78BFA' : '#5A586E'" />
          <input
            v-model="urlValue"
            :placeholder="t('decks.add.urlPlaceholder')"
            class="flex-1 min-w-0 bg-transparent border-0 outline-none text-fg-0 font-mono text-[13.5px] font-medium tracking-snug"
            @keydown.enter="triggerParse"
          />
          <button
            v-if="urlValue"
            class="flex items-center justify-center cursor-pointer shrink-0 w-7 h-7 rounded-full bg-divider border-0 text-fg-2"
            @click="clearUrl"
          >
            <SbIcon name="x" :size="11" :stroke="2.4" />
          </button>
        </div>

        <!-- State feedback -->
        <div class="mt-2.5 min-h-5.5">
          <div
            v-if="urlState === 'fetching'"
            class="inline-flex items-center gap-1.75 py-1 pl-2 pr-2.5 rounded-full bg-crown/10 border border-crown/22"
          >
            <div class="w-[11px] h-[11px] rounded-full border-2 shrink-0 animate-spin border-crown border-t-transparent" />
            <span class="text-[11.5px] font-bold text-crown -tracking-tight">{{ t('decks.add.importingDeck') }}</span>
          </div>
          <div
            v-else-if="urlState === 'error'"
            class="inline-flex items-center gap-1.75 py-1 pl-2 pr-2.5 rounded-full bg-danger/10 border border-danger/28 text-[#FCA5A5]"
          >
            <SbIcon name="x" :size="11" :stroke="2.4" />
            <span class="text-[11.5px] font-bold -tracking-tight">{{ store.importError ?? t('decks.add.importErrorFallback') }}</span>
          </div>
          <div
            v-else-if="looksLikeUrl"
            class="inline-flex items-center gap-1.75 py-1 pl-2 pr-2.5 rounded-full bg-tide/10 border border-tide/22 text-tide-2"
          >
            <SbIcon name="check" :size="11" :stroke="2.6" />
            <span class="text-[11.5px] font-bold -tracking-tight">{{ t('decks.add.detected', { service: detectedService }) }}</span>
          </div>
        </div>

        <!-- Supported services -->
        <div class="mt-4.5">
          <div class="text-eyebrow-label mb-2">{{ t('decks.add.supported') }}</div>
          <div class="flex flex-wrap gap-1.5">
            <div
              v-for="s in SERVICES"
              :key="s.id"
              class="inline-flex items-center py-1.5 px-2.75 rounded-full border border-divider text-[11.5px] font-semibold font-body gap-1.5"
              :class="s.supported ? 'bg-bg-1 text-fg-1' : 'bg-transparent text-fg-3 opacity-55'"
            >
              <SbIcon v-if="s.supported" name="check" :size="11" color="#2DD4BF" :stroke="2.4" />
              <span v-else class="text-eyebrow text-fg-3 font-bold tracking-[0.08em] uppercase">{{ t('decks.add.soon') }}</span>
              {{ s.name }}
            </div>
          </div>
        </div>

        <!-- Hint box -->
        <div class="flex items-start mt-4.5 py-2.5 px-3 bg-arcane/6 border border-arcane/16 rounded-md gap-2">
          <SbIcon name="sparkle" :size="13" color="#A78BFA" :stroke="2" />
          <div class="text-[11.5px] text-fg-1 leading-normal">
            {{ t('decks.add.hint') }}
          </div>
        </div>
      </div>

      <!-- Placeholder illustration -->
      <div class="mt-8 mx-5 pt-6 px-5 pb-5.5 bg-[linear-gradient(160deg,rgba(139,92,246,0.10),rgba(20,184,166,0.04)_70%,transparent)] border border-dashed border-arcane-edge rounded-[14px] text-center">
        <svg width="80" height="64" viewBox="0 0 80 64" class="mx-auto mb-3 block">
          <g fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="10" y="14" width="28" height="40" rx="3" stroke="rgba(167,139,250,0.55)" stroke-width="1.4" transform="rotate(-8 24 34)" />
            <rect x="26" y="8"  width="28" height="40" rx="3" stroke="rgba(244,185,66,0.55)"  stroke-width="1.4" />
            <rect x="42" y="14" width="28" height="40" rx="3" stroke="rgba(45,212,191,0.55)"  stroke-width="1.4" transform="rotate(8 56 34)" />
          </g>
        </svg>
        <div class="font-display font-bold text-fg-0 text-[16px] tracking-[-0.015em]">{{ t('decks.add.dropTitle') }}</div>
        <div class="text-[12.5px] text-fg-2 mt-1.5 max-w-65 mx-auto leading-normal">
          {{ t('decks.add.dropBody') }}
        </div>
      </div>

      <div class="h-32.5" />
    </div>

    <!-- ── Sticky bottom CTA ──────────────────────────────────── -->
    <div class="absolute bottom-0 left-0 right-0 pointer-events-none pt-3 px-4 pb-7 bg-[linear-gradient(180deg,rgba(6,7,13,0)_0%,rgba(6,7,13,0.92)_30%,#06070D_70%)]">
      <button
        class="w-full inline-flex items-center justify-center pointer-events-auto h-13 rounded-[14px] border-0 font-body font-bold text-body-lg tracking-snug gap-2"
        :class="looksLikeUrl && urlState !== 'fetching'
          ? 'bg-arcane text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
          : 'bg-bg-2 text-fg-3 cursor-not-allowed'"
        :disabled="!looksLikeUrl || urlState === 'fetching'"
        @click="triggerParse"
      >
        <template v-if="urlState === 'fetching'">
          <div class="w-[11px] h-[11px] rounded-full border-2 shrink-0 animate-spin border-white/60 border-t-transparent" />
          {{ t('decks.add.importing') }}
        </template>
        <template v-else>
          {{ t('decks.add.importDeck') }}
          <SbIcon v-if="looksLikeUrl" name="arrow" :size="16" :stroke="2.4" />
        </template>
      </button>
    </div>
  </div>
</template>
