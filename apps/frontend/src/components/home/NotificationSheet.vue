<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'
import type { IconName } from '@/components/ui/SbIcon.vue'
import { useFormat } from '@/composables/useFormat'
import type { NotificationItem, NotificationType } from '@/types/api'

const { relative } = useFormat()
const { t, te } = useI18n()

defineProps<{
  open: boolean
  notifications: NotificationItem[] | null
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

const iconByType: Record<NotificationType, IconName> = {
  member_joined:          'pods',
  member_approved:        'check',
  role_changed:           'crown',
  deck_archidekt_deleted: 'decks',
}

// Rows carry `params` for client-side copy; older rows only have the English
// `title`/`body` the server wrote, so fall back to those.
function titleKey(n: NotificationItem): string {
  const base = `home.notifications.types.${n.type}`
  return n.type === 'role_changed' ? `${base}.${n.params?.role ?? ''}` : `${base}.title`
}

function titleFor(n: NotificationItem): string {
  const key = titleKey(n)
  return n.params && te(key) ? t(key, n.params) : n.title
}

function bodyFor(n: NotificationItem): string | null {
  const key = `home.notifications.types.${n.type}.body`
  return n.params && te(key) ? t(key, n.params) : n.body
}

function onItemClick(n: NotificationItem) {
  if (n.playgroupId) {
    router.push(`/pods/${n.playgroupId}`)
  } else if (n.deckId) {
    router.push(`/decks/${n.deckId}`)
  }
  emit('close')
}
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
        {{ t('home.notifications.title') }}
      </h2>
      <button
        class="bg-transparent border-0 text-arcane-2 text-body-sm font-semibold cursor-pointer p-1"
        @click="emit('close')"
      >{{ t('common.done') }}</button>
    </div>

    <!-- Empty state -->
    <div
      v-if="!notifications || notifications.length === 0"
      class="py-10 text-center text-fg-3 text-body-sm"
    >
      {{ t('home.notifications.empty') }}
    </div>

    <!-- Notification list -->
    <div v-else class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
      <button
        v-for="n in notifications"
        :key="n.id"
        class="flex items-start gap-3 p-3 rounded-lg cursor-pointer text-left font-body border transition-colors"
        :class="n.read
          ? 'bg-bg-2 border-divider'
          : 'bg-arcane/12 border-arcane/40'"
        @click="onItemClick(n)"
      >
        <div class="w-9 h-9 rounded-full bg-bg-3 flex items-center justify-center shrink-0 text-fg-1">
          <SbIcon :name="iconByType[n.type]" :size="18" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-display font-semibold text-body text-fg-0 leading-snug">
            {{ titleFor(n) }}
          </div>
          <div v-if="bodyFor(n)" class="text-caption text-fg-2 mt-0.5 truncate">
            {{ bodyFor(n) }}
          </div>
          <div class="text-caption text-fg-3 mt-1">
            {{ relative(n.createdAt) }}
          </div>
        </div>
        <div
          v-if="!n.read"
          class="w-2 h-2 rounded-full bg-crown shrink-0 mt-1.5"
        />
      </button>
    </div>
  </div>
</template>
