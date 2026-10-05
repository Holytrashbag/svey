<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { authClient } from '@/lib/auth-client'
import EmailAuthForm from '@/components/auth/EmailAuthForm.vue'
import SbSpinner from '@/components/ui/SbSpinner.vue'

const { t } = useI18n()

// ── Copy variants ─────────────────────────────────────────────────────────────

interface HeroPart { text?: string; color?: string; italic?: boolean; br?: boolean }
interface CopyVariant { hero: HeroPart[]; sub: string; fontSize?: string }

// Presentation (colour / italic / line break) stays here; the text comes from i18n.
const COPY = computed<Record<string, CopyVariant>>(() => ({
  pod: {
    hero: [
      { text: t('auth.hero.pod.a') },
      { text: t('auth.hero.pod.b'), color: '#F4B942' },
    ],
    sub: t('auth.hero.pod.sub'),
  },
  wins: {
    hero: [
      { text: t('auth.hero.wins.a') },
      { br: true },
      { text: t('auth.hero.wins.b'), color: '#A78BFA' },
    ],
    sub: t('auth.hero.wins.sub'),
  },
  dave: {
    hero: [
      { text: t('auth.hero.dave.a') },
      { text: t('auth.hero.dave.b'), color: '#F4B942', italic: true },
      { text: t('auth.hero.dave.c') },
      { text: t('auth.hero.dave.d'), color: '#A78BFA', italic: true },
      { text: t('auth.hero.dave.e') },
    ],
    sub: t('auth.hero.dave.sub'),
    fontSize: '32px',
  },
}))

// ── Mana pip grid data ────────────────────────────────────────────────────────

const MTG_COLORS = ['#F3E4B5', '#4A8FE7', '#6B5B85', '#E8654E', '#4BAE6E']
const manaPips = Array.from({ length: 16 }, (_, row) =>
  Array.from({ length: 8 }, (_, col) => ({
    cx: col * 56 + (row % 2 ? 28 : 0),
    cy: row * 48,
    fill: MTG_COLORS[(row + col) % MTG_COLORS.length],
    opacity: 0.10 + 0.06 * Math.sin((row + col) * 1.7),
  }))
).flat()

// ── Props ─────────────────────────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  bg?: 'peek' | 'glow' | 'mana' | 'clean'
  copy?: 'pod' | 'wins' | 'dave'
  layout?: 'card' | 'stats'
  showTeaser?: boolean
}>(), { bg: 'peek', copy: 'wins', layout: 'stats', showTeaser: true })

// ── Entry animation ───────────────────────────────────────────────────────────

const isVisible = ref(false)
onMounted(() => requestAnimationFrame(() => { isVisible.value = true }))

function enterStyle(delay: number): CSSProperties {
  return {
    opacity: isVisible.value ? 1 : 0,
    transform: isVisible.value ? 'translateY(0)' : 'translateY(8px)',
    transition: `opacity 360ms cubic-bezier(0.2,0.8,0.2,1) ${delay}ms, transform 360ms cubic-bezier(0.2,0.8,0.2,1) ${delay}ms`,
  }
}

// ── Auth handlers ─────────────────────────────────────────────────────────────

const busy = ref<'discord' | 'google' | null>(null)
const showEmailForm = ref(false)

async function onDiscord() {
  busy.value = 'discord'
  await authClient.signIn.social({ provider: 'discord', callbackURL: window.location.origin })
  busy.value = null
}

async function onGoogle() {
  busy.value = 'google'
  await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin })
  busy.value = null
}

const currentCopy = computed((): CopyVariant => COPY.value[props.copy] ?? (COPY.value.wins as CopyVariant))
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-bg-0 text-fg-0">

    <!-- ── Backgrounds ────────────────────────────────────────────────────── -->

    <!-- Dashboard peek (default) -->
    <div v-if="bg === 'peek'" aria-hidden="true" class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute inset-0 opacity-55 scale-105 filter-[blur(28px)_saturate(120%)]">
        <div class="absolute top-20 left-6 w-50 h-25 rounded-3xl bg-arcane" />
        <div class="absolute top-25 right-6 w-40 h-20 rounded-3xl bg-crown" />
        <div class="absolute top-60 left-10 w-70 h-15 rounded-3xl bg-tide" />
        <div class="absolute top-90 left-6 w-55 h-22.5 rounded-3xl bg-arcane" />
        <div class="absolute top-105 right-7.5 w-35 h-17.5 rounded-3xl bg-crown" />
        <div class="absolute top-135 left-15 w-60 h-20 rounded-3xl bg-tide" />
        <div class="absolute bottom-20 right-5 w-45 h-25 rounded-3xl bg-arcane" />
      </div>
      <!-- Vignette -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(6,7,13,0.78),rgba(6,7,13,0.94)_70%)]" />
      <!-- Arcane glow bloom -->
      <div class="absolute rounded-full -top-30 -right-30 w-105 h-105 bg-[radial-gradient(circle,rgba(139,92,246,0.55),rgba(139,92,246,0)_65%)] filter-[blur(8px)]" />
      <div class="absolute rounded-full -bottom-40 -left-40 w-115 h-115 bg-[radial-gradient(circle,rgba(244,185,66,0.18),rgba(244,185,66,0)_60%)] filter-[blur(8px)]" />
      <div class="absolute rounded-full top-90 -right-25 w-60 h-60 bg-[radial-gradient(circle,rgba(20,184,166,0.16),rgba(20,184,166,0)_65%)] filter-[blur(4px)]" />
    </div>

    <!-- Jewel-tone glow only -->
    <div v-else-if="bg === 'glow'" aria-hidden="true" class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute rounded-full -top-30 -right-30 w-105 h-105 bg-[radial-gradient(circle,rgba(139,92,246,0.55),rgba(139,92,246,0)_65%)] filter-[blur(8px)]" />
      <div class="absolute rounded-full -bottom-40 -left-40 w-115 h-115 bg-[radial-gradient(circle,rgba(244,185,66,0.18),rgba(244,185,66,0)_60%)] filter-[blur(8px)]" />
      <div class="absolute rounded-full top-90 -right-25 w-60 h-60 bg-[radial-gradient(circle,rgba(20,184,166,0.16),rgba(20,184,166,0)_65%)] filter-[blur(4px)]" />
    </div>

    <!-- Mana pip grid -->
    <div
      v-else-if="bg === 'mana'"
      aria-hidden="true"
      class="absolute inset-0 overflow-hidden pointer-events-none mask-[radial-gradient(ellipse_at_50%_30%,#000_30%,transparent_75%)]"
    >
      <svg width="100%" height="100%" viewBox="0 0 420 800" preserveAspectRatio="xMidYMid slice">
        <circle
          v-for="(pip, i) in manaPips"
          :key="i"
          :cx="pip.cx"
          :cy="pip.cy"
          r="4"
          :fill="pip.fill"
          :opacity="pip.opacity"
        />
      </svg>
      <div class="absolute rounded-full -top-30 -right-30 w-105 h-105 bg-[radial-gradient(circle,rgba(139,92,246,0.55),rgba(139,92,246,0)_65%)] filter-[blur(8px)]" />
      <div class="absolute rounded-full -bottom-40 -left-40 w-115 h-115 bg-[radial-gradient(circle,rgba(244,185,66,0.18),rgba(244,185,66,0)_60%)] filter-[blur(8px)]" />
    </div>

    <!-- Clean -->
    <div v-else aria-hidden="true" class="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,#0A0B16_0%,#06070D_70%)]" />

    <!-- ── Content ────────────────────────────────────────────────────────── -->
    <div class="relative z-10 min-h-screen flex flex-col px-6 pt-14 pb-8">

      <!-- Brand mark -->
      <div class="flex items-center gap-2.5" :style="enterStyle(0)">
        <svg width="36" height="36" viewBox="0 0 128 128" fill="none" aria-label="Svey">
          <rect width="128" height="128" rx="28" fill="#8B5CF6" />
          <path d="M79 30 H50 a14 14 0 0 0 0 28 h28 a14 14 0 0 1 0 28 H49" stroke="#F5F4FB" stroke-width="14" stroke-linecap="butt" fill="none" />
          <rect x="79" y="23" width="14" height="14" rx="3" fill="#F4B942" />
          <rect x="35" y="79" width="14" height="14" rx="3" fill="#14B8A6" />
        </svg>
        <span class="font-display font-bold text-stat tracking-tight">Svey</span>
      </div>

      <!-- Flex spacer: push teaser + hero to vertical middle -->
      <div class="flex-1 min-h-6" />

      <!-- Teaser card -->
      <div v-if="showTeaser" class="mb-6" :style="enterStyle(80)">

        <!-- Stat tiles (default layout) -->
        <div v-if="layout === 'stats'" class="grid grid-cols-3 gap-2">
          <div
            v-for="stat in [
              { v: '12',  s: '',  l: t('auth.teaser.wins'),    c: 'text-crown' },
              { v: '63',  s: '%', l: t('auth.teaser.winrate'), c: 'text-fg-0' },
              { v: '8.2', s: '',  l: t('auth.teaser.threat'),  c: 'text-arcane-2' },
            ]"
            :key="stat.l"
            class="rounded-lg px-3 py-2.5 border border-white/[8%] backdrop-blur-xl backdrop-saturate-140 bg-bg-1/70"
          >
            <div
              class="font-display font-bold leading-none tabular-nums text-display-sm tracking-headline"
              :class="stat.c"
            >
              {{ stat.v }}<span v-if="stat.s" class="text-caption text-fg-2 ml-px font-medium">{{ stat.s }}</span>
            </div>
            <div class="text-eyebrow text-fg-2 font-semibold uppercase tracking-[0.08em] mt-1.25">{{ stat.l }}</div>
          </div>
        </div>

        <!-- Live game card -->
        <div
          v-else
          class="flex items-center gap-3 rounded-[14px] px-3.5 py-3 border border-white/[8%] backdrop-blur-xl backdrop-saturate-140 bg-bg-1/70 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
        >
          <div class="w-9 h-9 rounded-full bg-crown text-bg-0 flex items-center justify-center font-display font-bold text-[16px] shrink-0">D</div>
          <div class="flex-1 min-w-0">
            <div class="flex gap-1 items-center">
              <span class="font-bold text-[13px]">Dave</span>
              <span class="text-[12px] text-fg-2">{{ t('auth.teaser.wonWith') }}</span>
            </div>
            <div class="text-[12px] text-fg-1 mt-0.5 italic truncate">Atraxa, Praetors' Voice</div>
          </div>
          <div class="text-right shrink-0">
            <div class="inline-flex items-center gap-1 px-2 py-[3px] rounded-sm text-[10px] font-bold tracking-[0.04em] uppercase bg-crown/16 text-crown">{{ t('auth.teaser.winBadge') }}</div>
            <div class="font-mono text-[10px] text-fg-2 mt-1">{{ t('auth.teaser.sampleAgo') }}</div>
          </div>
        </div>
      </div>

      <!-- Hero copy -->
      <div :style="enterStyle(140)">
        <h1
          class="font-display font-bold text-fg-0 leading-[1.02] [text-wrap:balance] tracking-[-0.035em]"
          :style="{ fontSize: currentCopy.fontSize ?? '40px' }"
        >
          <template v-for="(part, i) in currentCopy.hero" :key="i">
            <br v-if="part.br" />
            <span v-else :style="part.color ? { color: part.color } : {}" :class="{ italic: part.italic }">{{ part.text }}</span>
          </template>
        </h1>
        <p class="text-body-lg text-fg-1 leading-snug mt-3.5 max-w-80">
          {{ currentCopy.sub }}
        </p>
      </div>

      <!-- Flex spacer: push buttons to bottom -->
      <div class="flex-1 min-h-6" />

      <!-- OAuth buttons / Email form -->
      <div class="flex flex-col gap-2.5" :style="enterStyle(200)">

        <template v-if="!showEmailForm">
          <!-- Discord (primary) -->
          <button
            class="w-full h-13 rounded-[14px] font-body font-bold text-body-lg text-white flex items-center justify-center gap-2.5 border-0 cursor-pointer transition-transform duration-80 active:scale-[0.985] disabled:cursor-wait shadow-[0_6px_18px_rgba(88,101,242,0.35),inset_0_1px_0_rgba(255,255,255,0.16)]"
            :class="busy === 'discord' ? 'bg-[#4752C4]' : 'bg-[#5865F2]'"
            :disabled="busy !== null"
            @click="onDiscord"
          >
            <svg v-if="busy !== 'discord'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.27 5.33a17.5 17.5 0 0 0-4.31-1.34l-.21.38a16 16 0 0 0-5.5 0l-.21-.38a17.5 17.5 0 0 0-4.31 1.34A18.21 18.21 0 0 0 1.5 17.07a17.5 17.5 0 0 0 5.36 2.71l.43-.6a11.2 11.2 0 0 1-1.8-.86l.45-.36a12.6 12.6 0 0 0 12.12 0l.45.36c-.57.33-1.17.62-1.8.86l.43.6A17.5 17.5 0 0 0 22.5 17.07a18.21 18.21 0 0 0-3.23-11.74ZM8.52 14.91c-1.06 0-1.93-.97-1.93-2.17s.85-2.18 1.93-2.18 1.95.98 1.93 2.18-.86 2.17-1.93 2.17Zm6.96 0c-1.06 0-1.93-.97-1.93-2.17s.85-2.18 1.93-2.18 1.94.98 1.93 2.18-.85 2.17-1.93 2.17Z" />
            </svg>
            <SbSpinner v-else :size="16" />
            <span>{{ busy === 'discord' ? t('auth.discordBusy') : t('auth.discord') }}</span>
          </button>

          <!-- Google (secondary) -->
          <button
            class="w-full h-13 rounded-[14px] bg-bg-2 text-fg-0 border border-white/12 font-body font-semibold text-body-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-80 active:scale-[0.985] disabled:cursor-wait hover:bg-bg-3"
            :disabled="busy !== null"
            @click="onGoogle"
          >
            <svg v-if="busy !== 'google'" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.34-.18-1.97H12v3.74h5.4a4.62 4.62 0 0 1-2 3.03v2.52h3.24c1.9-1.75 3-4.33 3-7.32z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.52c-.9.6-2.04.97-3.39.97-2.6 0-4.81-1.76-5.6-4.13H3.04v2.6A10 10 0 0 0 12 22z" />
              <path fill="#FBBC04" d="M6.4 13.89A6 6 0 0 1 6.08 12c0-.66.11-1.29.32-1.89V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.36-2.6z" />
              <path fill="#EA4335" d="M12 5.96c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.97 2.99 14.7 2 12 2A10 10 0 0 0 3.04 7.51l3.36 2.6C7.19 7.72 9.4 5.96 12 5.96z" />
            </svg>
            <SbSpinner v-else :size="16" />
            <span>{{ busy === 'google' ? t('auth.googleBusy') : t('auth.google') }}</span>
          </button>

          <!-- Or divider -->
          <div class="flex items-center gap-3 my-0.5">
            <div class="flex-1 h-px bg-white/10" />
            <span class="text-caption text-fg-3">{{ t('auth.or') }}</span>
            <div class="flex-1 h-px bg-white/10" />
          </div>

          <!-- Email toggle -->
          <button
            class="w-full h-12 rounded-[14px] bg-transparent text-fg-2 border border-white/10 font-body font-semibold text-body flex items-center justify-center gap-2 cursor-pointer hover:bg-bg-1 hover:text-fg-1 transition-all duration-80"
            @click="showEmailForm = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            {{ t('auth.email') }}
          </button>
        </template>

        <!-- Email form -->
        <EmailAuthForm v-else @back="showEmailForm = false" />
      </div>

      <!-- Hint -->
      <p v-if="!showEmailForm" class="text-caption text-fg-2 text-center mt-3.5" :style="enterStyle(260)">
        {{ t('auth.hint') }}
      </p>

      <!-- Fine print -->
      <p class="text-meta text-fg-3 text-center mt-4.5 leading-normal" :style="enterStyle(320)">
        <i18n-t keypath="auth.finePrint.agree" tag="span">
          <template #terms>
            <RouterLink to="/terms" class="text-fg-2 no-underline border-b border-fg-2/40 hover:text-fg-1">{{ t('auth.finePrint.terms') }}</RouterLink>
          </template>
          <template #privacy>
            <RouterLink to="/datenschutz" class="text-fg-2 no-underline border-b border-fg-2/40 hover:text-fg-1">{{ t('auth.finePrint.privacy') }}</RouterLink>
          </template>
        </i18n-t>
        <span class="block mt-1.5">
          <RouterLink to="/impressum" class="text-fg-3 no-underline border-b border-fg-3/40 hover:text-fg-1">Impressum</RouterLink>
        </span>
      </p>
    </div>
  </div>
</template>
