<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from 'vue-i18n'
import SbButton from './SbButton.vue'
import SbIconButton from './SbIconButton.vue'

// Registers the service worker (immediate) and exposes reactive update state.
// registerType is 'prompt', so a new build is only applied when the user taps
// "Reload" — never mid-game.
const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW()
const { t } = useI18n()

function reload() {
  updateServiceWorker(true)
}

function dismiss() {
  needRefresh.value = false
  offlineReady.value = false
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-3"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-3"
  >
    <div
      v-if="needRefresh || offlineReady"
      class="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div
        class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/12 bg-bg-2 px-4 py-3 shadow-lg shadow-black/40"
      >
        <p class="flex-1 font-body text-[14px] text-fg-0">
          <template v-if="needRefresh">{{ t('common.pwa.updateAvailable') }}</template>
          <template v-else>{{ t('common.pwa.offlineReady') }}</template>
        </p>
        <SbButton v-if="needRefresh" size="sm" variant="primary" @click="reload">{{ t('common.pwa.reload') }}</SbButton>
        <SbIconButton icon="x" :aria-label="t('common.close')" @click="dismiss" />
      </div>
    </div>
  </Transition>
</template>
