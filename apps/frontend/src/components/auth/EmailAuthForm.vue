<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authClient } from '@/lib/auth-client'

const emit = defineEmits<{
  back: []
}>()

const { t } = useI18n()
const router = useRouter()

const mode = ref<'signin' | 'signup' | 'forgot'>('signin')
const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const accepted = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)
const resetSent = ref(false)
const verifyPending = ref(false)
const resent = ref(false)

// Resend cooldown: seconds remaining before the verify email can be sent again.
const RESEND_COOLDOWN = 60
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearCooldown()
  }, 1000)
}

function clearCooldown() {
  if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
  cooldown.value = 0
}

onUnmounted(clearCooldown)

const resendLabel = computed(() =>
  cooldown.value > 0 ? t('auth.verify.resendIn', { s: cooldown.value }) : t('auth.verify.resend')
)

function setMode(m: 'signin' | 'signup' | 'forgot') {
  mode.value = m
  error.value = null
  resetSent.value = false
  verifyPending.value = false
  resent.value = false
  clearCooldown()
}

// ── Password strength ─────────────────────────────────────────────────────────

type Strength = 0 | 1 | 2 | 3 | 4

const strengthScore = computed((): Strength => {
  const pw = password.value
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s as Strength
})

const strengthMeta = computed<Record<Strength, { label: string; color: string; text: string }>>(() => ({
  0: { label: '',                            color: 'bg-white/10',  text: 'text-fg-3' },
  1: { label: t('auth.form.strength.weak'),   color: 'bg-red-500',   text: 'text-red-400' },
  2: { label: t('auth.form.strength.fair'),   color: 'bg-crown',     text: 'text-crown' },
  3: { label: t('auth.form.strength.good'),   color: 'bg-tide',      text: 'text-tide' },
  4: { label: t('auth.form.strength.strong'), color: 'bg-arcane',    text: 'text-arcane-2' },
}))

function segmentColor(i: number): string {
  return i <= strengthScore.value
    ? (strengthMeta.value[strengthScore.value]?.color ?? 'bg-white/10')
    : 'bg-white/10'
}

const confirmMismatch = computed(
  () => mode.value === 'signup' && confirmPassword.value.length > 0 && confirmPassword.value !== password.value
)

const submitLabel = computed(() =>
  mode.value === 'signin' ? t('auth.form.signin') : mode.value === 'signup' ? t('auth.form.createAccount') : t('auth.form.sendResetLink')
)

// ── Submit ────────────────────────────────────────────────────────────────────

async function requestReset() {
  if (!email.value) { error.value = t('auth.errors.enterEmail'); return }
  busy.value = true
  try {
    // Always reports success — Better Auth does not reveal whether the email exists.
    await authClient.requestPasswordReset({
      email: email.value,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    resetSent.value = true
  } catch {
    error.value = t('auth.errors.resetSendFailed')
  } finally {
    busy.value = false
  }
}

async function resendVerification() {
  error.value = null
  resent.value = false
  busy.value = true
  try {
    await authClient.sendVerificationEmail({
      email: email.value,
      callbackURL: `${window.location.origin}/home`,
    })
    resent.value = true
    startCooldown()
  } catch {
    error.value = t('auth.errors.resendFailed')
  } finally {
    busy.value = false
  }
}

async function submit() {
  error.value = null

  if (mode.value === 'forgot') {
    await requestReset()
    return
  }
  if (mode.value === 'signup' && password.value !== confirmPassword.value) {
    error.value = t('auth.errors.passwordsDoNotMatch')
    return
  }
  if (mode.value === 'signup' && !accepted.value) {
    error.value = t('auth.errors.acceptTerms')
    return
  }

  busy.value = true
  try {
    if (mode.value === 'signin') {
      const { error: err } = await authClient.signIn.email({
        email: email.value,
        password: password.value,
      })
      if (err) {
        // 403 = email not verified. Better Auth re-sends the verification mail
        // on each attempt, so show the pending screen instead of an error.
        if (err.status === 403) { verifyPending.value = true; return }
        error.value = err.message ?? t('auth.errors.signInFailed')
        return
      }
      await router.push('/home')
    } else {
      const { error: err } = await authClient.signUp.email({
        name: displayName.value,
        email: email.value,
        password: password.value,
        callbackURL: `${window.location.origin}/home`,
      })
      if (err) { error.value = err.message ?? t('auth.errors.signUpFailed'); return }
      // requireEmailVerification: no session yet. The user must confirm via the
      // emailed link (which then auto-signs them in and lands them on /home).
      verifyPending.value = true
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Email verification pending (after sign-up, or unverified sign-in) -->
    <template v-if="verifyPending">
      <div class="flex flex-col items-center text-center gap-3 py-4">
        <div class="w-12 h-12 rounded-full bg-arcane/15 flex items-center justify-center text-arcane-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <h2 class="font-display font-bold text-stat tracking-headline">{{ t('auth.verify.title') }}</h2>
        <p class="text-body-sm text-fg-1 leading-relaxed max-w-72">
          <i18n-t keypath="auth.verify.body" tag="span">
            <template #email>
              <span class="text-fg-0 font-semibold">{{ email }}</span>
            </template>
          </i18n-t>
        </p>
        <p class="text-caption text-fg-3 leading-relaxed max-w-72 -mt-1">
          {{ t('auth.verify.checkSpam') }}
        </p>

        <button
          type="button"
          :disabled="busy || cooldown > 0"
          class="h-11 px-5 rounded-[14px] bg-bg-2 border border-white/12 text-fg-0 font-body font-semibold text-body flex items-center justify-center gap-2 transition-colors hover:border-white/20 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          @click="resendVerification"
        >
          <div v-if="busy" class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span>{{ resendLabel }}</span>
        </button>

        <p v-if="resent" class="text-caption text-arcane-2">{{ t('auth.verify.sent') }}</p>
        <p v-else-if="error" class="text-caption text-red-400">{{ error }}</p>

        <button
          type="button"
          class="text-caption text-fg-2 hover:text-fg-1 transition-colors mt-1"
          @click="setMode('signin')"
        >
          &larr; {{ t('auth.verify.backToSignIn') }}
        </button>
      </div>
    </template>

    <!-- Reset link sent confirmation -->
    <template v-else-if="resetSent">
      <div class="flex flex-col items-center text-center gap-3 py-4">
        <div class="w-12 h-12 rounded-full bg-arcane/15 flex items-center justify-center text-arcane-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <p class="text-body-sm text-fg-1 leading-relaxed max-w-72">
          <i18n-t keypath="auth.reset.sentBody" tag="span">
            <template #email>
              <span class="text-fg-0 font-semibold">{{ email }}</span>
            </template>
          </i18n-t>
        </p>
        <button
          type="button"
          class="text-caption text-fg-2 hover:text-fg-1 transition-colors mt-1"
          @click="setMode('signin')"
        >
          &larr; {{ t('auth.verify.backToSignIn') }}
        </button>
      </div>
    </template>

    <template v-else>
      <div class="flex rounded-xl bg-bg-1 p-1 gap-1">
        <button
          type="button"
          class="flex-1 h-9 rounded-lg text-body font-semibold transition-colors"
          :class="mode !== 'signup' ? 'bg-bg-3 text-fg-0' : 'text-fg-2 hover:text-fg-1'"
          @click="setMode('signin')"
        >{{ t('auth.form.signin') }}</button>
        <button
          type="button"
          class="flex-1 h-9 rounded-lg text-body font-semibold transition-colors"
          :class="mode === 'signup' ? 'bg-bg-3 text-fg-0' : 'text-fg-2 hover:text-fg-1'"
          @click="setMode('signup')"
        >{{ t('auth.form.signup') }}</button>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="submit">
        <input
          v-if="mode === 'signup'"
          v-model="displayName"
          type="text"
          :placeholder="t('auth.form.displayName')"
          autocomplete="name"
          required
          class="h-12 rounded-xl bg-bg-2 border border-white/12 px-4 text-body text-fg-0 placeholder:text-fg-3 focus:outline-none focus:border-arcane/60 transition-colors"
        />
        <input
          v-model="email"
          type="email"
          :placeholder="t('auth.form.emailAddress')"
          autocomplete="email"
          required
          class="h-12 rounded-xl bg-bg-2 border border-white/12 px-4 text-body text-fg-0 placeholder:text-fg-3 focus:outline-none focus:border-arcane/60 transition-colors"
        />

        <p v-if="mode === 'forgot'" class="text-caption text-fg-2 leading-relaxed -mt-1">
          {{ t('auth.form.forgotIntro') }}
        </p>

        <input
          v-if="mode !== 'forgot'"
          v-model="password"
          type="password"
          :placeholder="t('auth.form.password')"
          :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
          maxlength="128"
          required
          class="h-12 rounded-xl bg-bg-2 border border-white/12 px-4 text-body text-fg-0 placeholder:text-fg-3 focus:outline-none focus:border-arcane/60 transition-colors"
        />

        <!-- Forgot password link (sign in only) -->
        <button
          v-if="mode === 'signin'"
          type="button"
          class="self-end text-caption text-fg-3 hover:text-fg-1 transition-colors -mt-1"
          @click="setMode('forgot')"
        >
          {{ t('auth.form.forgotPassword') }}
        </button>

        <!-- Strength bar (sign up only) -->
        <div v-if="mode === 'signup' && password.length > 0" class="-mt-1 flex flex-col gap-1.5">
          <div class="flex gap-1 h-1">
            <div
              v-for="i in 4"
              :key="i"
              class="flex-1 rounded-full transition-colors duration-200"
              :class="segmentColor(i)"
            />
          </div>
          <p class="text-caption text-right transition-colors" :class="strengthMeta[strengthScore].text">
            {{ strengthMeta[strengthScore].label }}
          </p>
        </div>

        <!-- Confirm password (sign up only) -->
        <div v-if="mode === 'signup'" class="flex flex-col gap-1">
          <input
            v-model="confirmPassword"
            type="password"
            :placeholder="t('auth.form.confirmPassword')"
            autocomplete="new-password"
            maxlength="128"
            required
            class="h-12 rounded-xl bg-bg-2 border px-4 text-body text-fg-0 placeholder:text-fg-3 focus:outline-none transition-colors"
            :class="confirmMismatch ? 'border-red-500/60 focus:border-red-500/80' : 'border-white/12 focus:border-arcane/60'"
          />
          <p v-if="confirmMismatch" class="text-caption text-red-400 pl-1">{{ t('auth.form.passwordsDontMatch') }}</p>
        </div>

        <!-- Consent / terms acceptance (sign up only) -->
        <label v-if="mode === 'signup'" class="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            v-model="accepted"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/20 bg-bg-2 accent-arcane cursor-pointer"
          />
          <span class="text-caption text-fg-2 leading-snug">
            <i18n-t keypath="auth.form.consent" tag="span">
              <template #terms>
                <a href="/terms" target="_blank" rel="noopener" class="text-fg-1 underline underline-offset-2 hover:text-fg-0">{{ t('auth.form.consentTerms') }}</a>
              </template>
              <template #privacy>
                <a href="/datenschutz" target="_blank" rel="noopener" class="text-fg-1 underline underline-offset-2 hover:text-fg-0">{{ t('auth.form.consentPrivacy') }}</a>
              </template>
            </i18n-t>
          </span>
        </label>

        <p v-if="error" class="text-caption text-red-400 text-center -mt-1">{{ error }}</p>

        <button
          type="submit"
          :disabled="busy || (mode === 'signup' && !accepted)"
          class="w-full h-13 rounded-[14px] bg-arcane text-white font-body font-bold text-body-lg flex items-center justify-center gap-2.5 transition-transform duration-80 active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100 disabled:cursor-not-allowed shadow-[0_6px_18px_rgba(139,92,246,0.35),inset_0_1px_0_rgba(255,255,255,0.16)]"
        >
          <div v-if="busy" class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span>{{ busy ? '...' : submitLabel }}</span>
        </button>
      </form>

      <button
        type="button"
        class="text-caption text-fg-2 text-center hover:text-fg-1 transition-colors mt-1"
        @click="emit('back')"
      >
        &larr; {{ t('auth.form.useSocialInstead') }}
      </button>
    </template>
  </div>
</template>
