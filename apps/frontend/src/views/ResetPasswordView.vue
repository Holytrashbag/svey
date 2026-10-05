<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authClient } from '@/lib/auth-client'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const linkError = computed(() => typeof route.query.error === 'string')

const state = ref<'form' | 'invalid' | 'success'>('form')
const password = ref('')
const confirmPassword = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

onMounted(() => {
  if (linkError.value || !token.value) state.value = 'invalid'
})

const mismatch = computed(() => confirmPassword.value.length > 0 && confirmPassword.value !== password.value)

async function submit() {
  error.value = null
  if (password.value.length < 8) { error.value = t('auth.errors.passwordTooShort'); return }
  if (password.value !== confirmPassword.value) { error.value = t('auth.errors.passwordsDoNotMatch'); return }

  busy.value = true
  try {
    const { error: err } = await authClient.resetPassword({ newPassword: password.value, token: token.value })
    if (err) { error.value = err.message ?? t('auth.errors.resetFailed'); return }
    state.value = 'success'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg-0 text-fg-0 flex items-center justify-center px-6">
    <div class="w-full max-w-sm">
      <!-- Brand mark -->
      <div class="flex items-center gap-2.5 mb-8 justify-center">
        <svg width="32" height="32" viewBox="0 0 128 128" fill="none" aria-label="Svey">
          <rect width="128" height="128" rx="28" fill="#8B5CF6" />
          <path d="M79 30 H50 a14 14 0 0 0 0 28 h28 a14 14 0 0 1 0 28 H49" stroke="#F5F4FB" stroke-width="14" stroke-linecap="butt" fill="none" />
          <rect x="79" y="23" width="14" height="14" rx="3" fill="#F4B942" />
          <rect x="35" y="79" width="14" height="14" rx="3" fill="#14B8A6" />
        </svg>
        <span class="font-display font-bold text-stat tracking-tight">Svey</span>
      </div>

      <!-- Invalid / expired link -->
      <div v-if="state === 'invalid'" class="flex flex-col items-center text-center gap-4">
        <h1 class="font-display font-bold text-display-sm tracking-headline">{{ t('auth.reset.linkExpiredTitle') }}</h1>
        <p class="text-body-sm text-fg-2 leading-relaxed max-w-72">
          {{ t('auth.reset.linkExpiredBody') }}
        </p>
        <button
          class="h-12 px-6 rounded-[14px] bg-arcane text-white font-body font-semibold text-body flex items-center justify-center cursor-pointer transition-transform duration-80 active:scale-[0.985]"
          @click="router.push('/auth')"
        >
          {{ t('auth.reset.backToSignIn') }}
        </button>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'success'" class="flex flex-col items-center text-center gap-4">
        <div class="w-12 h-12 rounded-full bg-arcane/15 flex items-center justify-center text-arcane-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 class="font-display font-bold text-display-sm tracking-headline">{{ t('auth.reset.updatedTitle') }}</h1>
        <p class="text-body-sm text-fg-2 leading-relaxed max-w-72">
          {{ t('auth.reset.updatedBody') }}
        </p>
        <button
          class="h-12 px-6 rounded-[14px] bg-arcane text-white font-body font-semibold text-body flex items-center justify-center cursor-pointer transition-transform duration-80 active:scale-[0.985]"
          @click="router.push('/auth')"
        >
          {{ t('auth.reset.signIn') }}
        </button>
      </div>

      <!-- Reset form -->
      <div v-else>
        <h1 class="font-display font-bold text-display-sm tracking-headline text-center mb-2">{{ t('auth.reset.setNewTitle') }}</h1>
        <p class="text-body-sm text-fg-2 leading-relaxed text-center mb-6">{{ t('auth.reset.setNewIntro') }}</p>

        <form class="flex flex-col gap-3" @submit.prevent="submit">
          <input
            v-model="password"
            type="password"
            :placeholder="t('auth.reset.newPassword')"
            autocomplete="new-password"
            maxlength="128"
            required
            class="h-12 rounded-xl bg-bg-2 border border-white/12 px-4 text-body text-fg-0 placeholder:text-fg-3 focus:outline-none focus:border-arcane/60 transition-colors"
          />
          <input
            v-model="confirmPassword"
            type="password"
            :placeholder="t('auth.reset.confirmNewPassword')"
            autocomplete="new-password"
            maxlength="128"
            required
            class="h-12 rounded-xl bg-bg-2 border px-4 text-body text-fg-0 placeholder:text-fg-3 focus:outline-none transition-colors"
            :class="mismatch ? 'border-red-500/60 focus:border-red-500/80' : 'border-white/12 focus:border-arcane/60'"
          />
          <p v-if="error" class="text-caption text-red-400 text-center -mt-1">{{ error }}</p>

          <button
            type="submit"
            :disabled="busy"
            class="w-full h-13 rounded-[14px] bg-arcane text-white font-body font-bold text-body-lg flex items-center justify-center gap-2.5 transition-transform duration-80 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_6px_18px_rgba(139,92,246,0.35),inset_0_1px_0_rgba(255,255,255,0.16)]"
          >
            <div v-if="busy" class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span>{{ busy ? '...' : t('auth.reset.updatePassword') }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
