<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/composables/useNav'
import SbBottomNav from '@/components/ui/SbBottomNav.vue'
import SbIcon from '@/components/ui/SbIcon.vue'
import PlaygroupRow from '@/components/playgroups/PlaygroupRow.vue'
import PendingInviteCard from '@/components/playgroups/PendingInviteCard.vue'
import JoinSheet from '@/components/playgroups/JoinSheet.vue'
import CreatePlaygroupSheet from '@/components/playgroups/CreatePlaygroupSheet.vue'
import PlaygroupsEmptyState from '@/components/playgroups/PlaygroupsEmptyState.vue'
import { usePlaygroupStore } from '@/stores/usePlaygroupStore'
import SbSpinner from '@/components/ui/SbSpinner.vue'

const store = usePlaygroupStore()
const { t } = useI18n()

onMounted(() => store.fetchMyPlaygroups())

// ─── Create sheet ──────────────────────────────────────────────────────────────

const createOpen       = ref(false)
const createdCode      = ref<string | undefined>(undefined)
const createdPodId     = ref<string | undefined>(undefined)

async function onCreateSubmit(name: string) {
  try {
    const res = await store.createPlaygroup(name)
    createdCode.value  = res.inviteCode
    createdPodId.value = res.id
  } catch {
    // error already in store.createError
  }
}

function onCreateClose() {
  createOpen.value   = false
  createdCode.value  = undefined
  createdPodId.value = undefined
}

function onOpenPod(id: string) {
  onCreateClose()
  router.push(`/pods/${id}`)
}

// ─── Join sheet ────────────────────────────────────────────────────────────────

const joinOpen = ref(false)

async function onJoinSubmit(code: string) {
  try {
    const res = await store.joinPlaygroup(code)
    joinOpen.value = false
    router.push(`/pods/${res.playgroupId}`)
  } catch {
    // error surfaced via store.joinError
  }
}

// ─── Invite actions ────────────────────────────────────────────────────────────

function acceptInvite(playgroupId: string, memberId: string) {
  store.acceptInvite(playgroupId, memberId)
}

function declineInvite(playgroupId: string, memberId: string) {
  store.declineInvite(playgroupId, memberId)
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const router = useRouter()
const { onNav } = useNav()
</script>

<template>
  <div class="h-screen bg-bg-0 text-fg-0 overflow-hidden">
    <!-- Scrollable content -->
    <div class="h-full overflow-y-auto overflow-x-hidden pt-13 pb-27.5">

      <!-- Header -->
      <div class="px-5 pt-3 pb-7">
        <h1 class="font-display font-bold text-fg-0 text-[32px] tracking-[-0.03em] leading-[1.05]">{{ t('playgroups.title') }}</h1>
        <div class="text-body-sm text-fg-2 mt-2">
          <template v-if="store.active.length === 0 && store.pending.length === 0">
            {{ t('playgroups.getYouInPod') }}
          </template>
          <template v-else>
            <span class="text-fg-0 font-semibold">{{ t('playgroups.active', { count: store.active.length }) }}</span>
            <template v-if="store.pending.length > 0">
              <span class="text-fg-4 mx-1.5">·</span>
              <span class="text-arcane-2 font-semibold">
                {{ t('playgroups.invitesWaiting', store.pending.length) }}
              </span>
            </template>
          </template>
        </div>
      </div>

      <!-- Primary actions -->
      <div class="px-5 pb-8 flex gap-2">
        <button
          class="flex-1 h-11.5 bg-arcane text-white border-0 font-bold text-body font-body cursor-pointer flex items-center justify-center gap-1.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          @click="createOpen = true"
        >
          <SbIcon name="plus" :size="16" :stroke="2.4" />
          {{ t('playgroups.createPlaygroup') }}
        </button>
        <button
          class="flex-1 h-11.5 bg-transparent text-fg-0 border border-divider-strong font-semibold text-body font-body cursor-pointer flex items-center justify-center gap-1.5 rounded-lg"
          @click="joinOpen = true"
        >
          {{ t('playgroups.joinWithCode') }}
        </button>
      </div>

      <!-- Loading / error -->
      <div v-if="store.loading" class="flex items-center justify-center py-8">
        <SbSpinner />
      </div>
      <div v-else-if="store.error" class="px-5 text-danger text-body-sm">{{ store.error }}</div>

      <!-- Empty state -->
      <div v-else-if="store.active.length === 0 && store.pending.length === 0" class="px-5">
        <PlaygroupsEmptyState @create="createOpen = true" @join="joinOpen = true" />
      </div>

      <template v-else>
        <!-- Pending invites -->
        <div v-if="store.pending.length > 0" class="mb-8">
          <div class="px-5 pb-3">
            <div class="text-eyebrow-label">{{ t('playgroups.pendingInvites') }}</div>
          </div>
          <div class="px-5 flex flex-col gap-2.5">
            <PendingInviteCard
              v-for="inv in store.pending"
              :key="inv.id"
              :invite="inv"
              @accept="acceptInvite(inv.playgroupId, inv.id)"
              @decline="declineInvite(inv.playgroupId, inv.id)"
            />
          </div>
        </div>

        <!-- Active pods -->
        <div class="mb-30">
          <div class="px-5 pb-3">
            <div class="text-eyebrow-label">{{ t('playgroups.activeLabel') }}</div>
          </div>
          <div class="px-5 flex flex-col gap-2.5">
            <PlaygroupRow
              v-for="pod in store.active"
              :key="pod.id"
              :pod="pod"
              @open="router.push(`/pods/${pod.id}`)"
            />
          </div>
        </div>
      </template>

    </div>

    <!-- Bottom nav -->
    <SbBottomNav active="pods" @change="onNav" />

    <!-- Create sheet -->
    <CreatePlaygroupSheet
      :open="createOpen"
      :submitting="store.createLoading"
      :server-invite-code="createdCode"
      :server-pod-id="createdPodId"
      @submit="onCreateSubmit"
      @close="onCreateClose"
      @open-pod="onOpenPod"
    />

    <!-- Join sheet -->
    <JoinSheet
      :open="joinOpen"
      :loading="store.joinLoading"
      :server-error="store.joinError"
      @close="joinOpen = false"
      @submit="onJoinSubmit"
    />
  </div>
</template>
