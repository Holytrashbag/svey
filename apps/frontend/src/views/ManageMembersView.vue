<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNav } from '@/composables/useNav'
import { usePlaygroupStore } from '@/stores/usePlaygroupStore'
import type { PlaygroupMemberDetail } from '@/types/api'
import SbIcon from '@/components/ui/SbIcon.vue'
import SbBottomNav from '@/components/ui/SbBottomNav.vue'
import { AVATAR_ROLE } from '@/lib/mtg'
import { useFormat } from '@/composables/useFormat'
import { useI18n } from 'vue-i18n'

const { relative: formatRelativeTime, founded: formatFounded } = useFormat()
const { t } = useI18n()

// --- Setup -------------------------------------------------------------------

const route  = useRoute()
const router = useRouter()
const store  = usePlaygroupStore()

const playgroupId = route.params['id'] as string

onMounted(async () => {
  await store.fetchPlaygroupDetail(playgroupId)
  await store.fetchPendingMembers(playgroupId)
})

// --- State -------------------------------------------------------------------

const pendingStates = ref<Record<string, 'approved' | 'declined'>>({})
const copied        = ref(false)
const regenSpin     = ref(false)
const toast         = ref<string | null>(null)
const sheetMemberId = ref<string | null>(null)
const sheetOpen     = ref(false)

// --- Computed ----------------------------------------------------------------

const playgroup      = computed(() => store.currentPlaygroup)
const members        = computed(() => playgroup.value?.members ?? [])
const pendingMembers = computed(() => store.pendingMembers)
const pendingActive  = computed(() => pendingMembers.value.length)
const onlineCount    = computed(() => members.value.filter(m => m.online).length)

const sortedMembers = computed(() => {
  const order = (m: PlaygroupMemberDetail) => m.isOwner ? 0 : m.role === 'admin' ? 1 : 2
  return [...members.value].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name))
})

const sheetMember = computed(() =>
  members.value.find(m => m.id === sheetMemberId.value) ?? null,
)

const currentUserMember = computed(() => members.value.find(m => m.you) ?? null)
const isCurrentUserOwner = computed(() => currentUserMember.value?.isOwner === true)

// --- Avatar helpers ----------------------------------------------------------

function avatarBg(m: { isOwner?: boolean; role?: 'admin' | 'member'; you?: boolean }): string {
  if (m.you)              return AVATAR_ROLE.you.bg
  if (m.isOwner)          return AVATAR_ROLE.crown.bg
  if (m.role === 'admin') return AVATAR_ROLE.admin.bg
  return AVATAR_ROLE.default.bg
}

function avatarFg(m: { isOwner?: boolean; role?: 'admin' | 'member'; you?: boolean }): string {
  if (m.you)              return AVATAR_ROLE.you.fg
  if (m.isOwner)          return AVATAR_ROLE.crown.fg
  if (m.role === 'admin') return AVATAR_ROLE.admin.fg
  return AVATAR_ROLE.default.fg
}

// --- Actions -----------------------------------------------------------------

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = null }, 2400)
}

function handleCopy() {
  if (!playgroup.value) return
  navigator.clipboard.writeText(playgroup.value.code).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1800)
}

async function handleRegen() {
  regenSpin.value = true
  try {
    await store.regenerateInviteCode(playgroupId)
    showToast(t('playgroups.manage.toast.codeRegenerated'))
  } catch {
    showToast(t('playgroups.manage.toast.codeRegenFailed'))
  } finally {
    setTimeout(() => { regenSpin.value = false }, 700)
  }
}

function removePendingState(id: string) {
  const next = { ...pendingStates.value }
  delete next[id]
  pendingStates.value = next
}

async function handleApprove(id: string) {
  const p = pendingMembers.value.find(x => x.id === id)
  pendingStates.value = { ...pendingStates.value, [id]: 'approved' }
  showToast(t('playgroups.manage.toast.joined', { name: p?.name ?? t('playgroups.manage.toast.defaultPlayer') }))
  try {
    await store.approvePendingMember(playgroupId, id)
  } catch {
    showToast(t('playgroups.manage.toast.approveFailed'))
    removePendingState(id)
    return
  }
  setTimeout(() => { removePendingState(id) }, 1400)
}

async function handleDecline(id: string) {
  pendingStates.value = { ...pendingStates.value, [id]: 'declined' }
  try {
    await store.rejectPendingMember(playgroupId, id)
  } catch {
    showToast(t('playgroups.manage.toast.declineFailed'))
    removePendingState(id)
    return
  }
  setTimeout(() => { removePendingState(id) }, 1100)
}

async function handleApproveAll() {
  const all = [...pendingMembers.value]
  for (const p of all) {
    pendingStates.value = { ...pendingStates.value, [p.id]: 'approved' }
  }
  showToast(t('playgroups.manage.toast.approvedCount', all.length))
  try {
    await Promise.all(all.map(p => store.approvePendingMember(playgroupId, p.id)))
  } catch {
    showToast(t('playgroups.manage.toast.someApprovalsFailed'))
  }
  setTimeout(() => { pendingStates.value = {} }, 1400)
}

function openMenu(id: string) {
  sheetMemberId.value = id
  sheetOpen.value = true
}

async function handleAction(action: string, id: string) {
  const m = members.value.find(x => x.id === id)
  if (!m) return

  if (action === 'promote') {
    try {
      await store.updateMemberRole(playgroupId, id, 'admin')
      showToast(t('playgroups.manage.toast.nowAdmin', { name: m.name }))
    } catch {
      showToast(t('playgroups.manage.toast.promoteFailed'))
    }
  } else if (action === 'demote') {
    try {
      await store.updateMemberRole(playgroupId, id, 'member')
      showToast(t('playgroups.manage.toast.nowMember', { name: m.name }))
    } catch {
      showToast(t('playgroups.manage.toast.demoteFailed'))
    }
  } else if (action === 'transfer') {
    try {
      await store.transferOwnership(playgroupId, id)
      showToast(t('playgroups.manage.toast.ownershipTransferred', { name: m.name }))
    } catch {
      showToast(t('playgroups.manage.toast.transferFailed'))
    }
  } else if (action === 'remove') {
    try {
      await store.removeMember(playgroupId, id)
      showToast(t('playgroups.manage.toast.removed', { name: m.name }))
    } catch {
      showToast(t('playgroups.manage.toast.removeFailed'))
    }
  }
  sheetOpen.value = false
}

const { onNav } = useNav()
</script>

<template>
  <div class="h-screen overflow-hidden bg-bg-0 text-fg-0">

    <!-- Scrollable body -->
    <div class="h-full overflow-y-auto overflow-x-hidden pt-13 pb-27.5">

      <!-- Header -->
      <div class="flex items-center justify-between gap-2 pt-3 pb-2 px-4">
        <button
          class="flex items-center justify-center bg-transparent border-0 cursor-pointer w-9 h-9 rounded-full text-fg-1"
          @click="router.back()"
        >
          <SbIcon name="back" :size="20" />
        </button>
        <div class="font-body font-bold text-body text-fg-0 tracking-snug">{{ t('playgroups.manage.headerTitle') }}</div>
        <button class="flex items-center justify-center bg-transparent border-0 cursor-pointer w-9 h-9 rounded-full text-fg-1">
          <SbIcon name="more" :size="20" />
        </button>
      </div>

      <!-- Title block -->
      <div class="pt-1 px-5 pb-5">
        <div class="font-body font-bold text-[10px] text-arcane-2 tracking-eyebrow uppercase">{{ playgroup?.name }}</div>
        <div class="font-display font-bold text-[30px] tracking-[-0.030em] leading-[1.05] text-fg-0 mt-1.5">{{ t('playgroups.manage.headerTitle') }}</div>
        <div class="text-body-sm text-fg-2 mt-1.5 leading-snug">
          <template v-if="pendingActive > 0">
            <i18n-t keypath="playgroups.manage.introPending" tag="span">
              <template #pending>
                <b class="text-fg-0">{{ t('playgroups.manage.pendingBold', pendingActive) }}</b>
              </template>
            </i18n-t>
          </template>
          <template v-else>
            {{ t('playgroups.manage.introEmpty') }}
          </template>
        </div>
      </div>

      <!-- Stat strip -->
      <div class="grid grid-cols-3 gap-4 px-5 pb-6.5">
        <div
          v-for="tile in [
            { value: members.length,          label: t('playgroups.manage.tiles.players'), color: 'text-fg-0' },
            { value: pendingActive,            label: t('playgroups.manage.tiles.pending'), color: pendingActive > 0 ? 'text-crown' : 'text-fg-0' },
            { value: playgroup?.totalGames ?? 0, label: t('playgroups.manage.tiles.games'),   color: 'text-fg-0' },
          ]"
          :key="tile.label"
        >
          <div
            class="font-display font-bold text-display tracking-[-0.03em] leading-none tabular-nums"
            :class="tile.color"
          >{{ tile.value }}</div>
          <div class="text-eyebrow-label mt-1.75">{{ tile.label }}</div>
        </div>
      </div>

      <!-- Invite link card -->
      <div class="mx-5 bg-bg-1 border border-divider rounded-2xl pt-4 px-4 pb-3.5 relative overflow-hidden">
        <!-- Accent gradient corner -->
        <div
          aria-hidden="true"
          class="absolute -top-12.5 -right-10 w-40 h-40 bg-[radial-gradient(circle,rgba(139,92,246,0.16),transparent_65%)] pointer-events-none"
        />

        <div class="relative z-1">
          <!-- Row 1: label -->
          <div class="flex items-center justify-between gap-2">
            <div class="font-bold text-[10px] text-arcane-2 tracking-eyebrow uppercase">{{ t('playgroups.manage.inviteCodeActive') }}</div>
          </div>

          <!-- Code row -->
          <div class="flex items-center gap-2.5 mt-3 p-3 bg-bg-0 border border-dashed border-arcane-edge rounded-lg">
            <div class="font-mono font-semibold text-fg-0 grow min-w-0 truncate text-body tracking-[0.04em]">{{ playgroup?.code ?? '—' }}</div>
            <button
              class="flex items-center gap-1.5 font-bold font-body border cursor-pointer shrink-0 h-8 px-3 rounded-[8px] text-[11.5px] tracking-[0.04em] uppercase transition-[background,color,border-color] duration-160 ease-linear"
              :class="copied
                ? 'bg-tide-wash text-tide-2 border-tide/33'
                : 'bg-divider text-fg-0 border-divider'"
              @click="handleCopy"
            >
              <SbIcon name="check" :size="12" :stroke="2.6" />
              {{ copied ? t('playgroups.manage.copied') : t('playgroups.manage.copy') }}
            </button>
          </div>

          <!-- Footer row: regen -->
          <div class="flex items-center justify-end gap-2 mt-2.5">
            <button
              class="flex items-center gap-1.5 bg-transparent border-0 font-bold cursor-pointer text-[11.5px] text-arcane-2 tracking-snug py-1"
              @click="handleRegen"
            >
              <!-- Regen icon -->
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
                class="origin-center transition-transform duration-600 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                :class="regenSpin ? 'rotate-360' : 'rotate-0'"
              >
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              {{ t('playgroups.manage.regenerate') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pending requests -->
      <template v-if="pendingActive > 0">
        <div class="flex items-baseline justify-between pt-8 px-5">
          <div class="font-bold text-[10px] text-crown tracking-eyebrow uppercase">{{ t('playgroups.manage.pendingHeader', pendingActive) }}</div>
          <button
            class="bg-transparent border-0 font-semibold cursor-pointer text-caption text-fg-2"
            @click="handleApproveAll"
          >{{ t('playgroups.manage.approveAll') }}</button>
        </div>

        <div class="pt-1 px-5">
          <div
            v-for="(p, i) in pendingMembers"
            :key="p.id"
            class="py-3.5 transition-opacity duration-160 ease-linear"
            :class="[
              i < pendingMembers.length - 1 ? 'border-b border-divider' : '',
              (pendingStates[p.id] === 'approved' || pendingStates[p.id] === 'declined') ? 'opacity-55' : 'opacity-100',
            ]"
          >
            <div class="flex items-start gap-3">
              <!-- Avatar -->
              <div class="rounded-full flex items-center justify-center font-display font-bold shrink-0 w-10.5 h-10.5 bg-bg-3 text-[#A8AABF] text-[17px] border border-divider">{{ p.name.charAt(0).toUpperCase() }}</div>

              <div class="grow min-w-0">
                <!-- Name + when -->
                <div class="flex items-baseline gap-1.5 flex-wrap">
                  <span class="font-display font-bold text-body-lg tracking-[-0.015em] text-fg-0">{{ p.name }}</span>
                  <span class="text-caption text-fg-3">{{ formatRelativeTime(p.requestedAt) }}</span>
                </div>

                <!-- Buttons or state badge -->
                <div class="flex gap-2 mt-2.5">
                  <!-- Approved badge -->
                  <div
                    v-if="pendingStates[p.id] === 'approved'"
                    class="flex items-center gap-1.5 font-bold py-1.5 px-3 rounded-[8px] bg-tide-wash text-tide-2 text-[11.5px] tracking-[0.04em] uppercase"
                  >
                    <SbIcon name="check" :size="12" :stroke="2.6" />
                    {{ t('playgroups.manage.approved') }}
                  </div>

                  <!-- Declined badge -->
                  <div
                    v-else-if="pendingStates[p.id] === 'declined'"
                    class="flex items-center gap-1.5 font-bold py-1.5 px-3 rounded-[8px] bg-overlay-1 text-fg-2 text-[11.5px] tracking-[0.04em] uppercase"
                  >
                    <SbIcon name="x" :size="12" :stroke="2.6" />
                    {{ t('playgroups.manage.declined') }}
                  </div>

                  <!-- Action buttons -->
                  <template v-else>
                    <button
                      class="font-body font-semibold cursor-pointer border flex-1 h-9 px-3 bg-overlay-1 text-fg-1 border-divider rounded-md text-[12.5px]"
                      @click="handleDecline(p.id)"
                    >{{ t('playgroups.manage.decline') }}</button>
                    <button
                      class="flex items-center justify-center gap-1.5 font-body font-bold cursor-pointer border-0 flex-[1.4] h-9 px-3 bg-arcane text-white rounded-md text-[12.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                      @click="handleApprove(p.id)"
                    >
                      <SbIcon name="check" :size="13" :stroke="2.6" />
                      {{ t('playgroups.manage.approve') }}
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Players section -->
      <div class="flex items-baseline justify-between pt-8 px-5">
        <div class="text-eyebrow-label">{{ t('playgroups.manage.playersHeader', { count: members.length }) }}</div>
        <div class="flex items-center gap-1.5 text-meta text-fg-3">
          <span class="inline-block w-1.75 h-1.75 rounded-full bg-success" />
          {{ t('playgroups.manage.online', { n: onlineCount }) }}
        </div>
      </div>

      <div class="pt-1 px-5">
        <div
          v-for="(m, i) in sortedMembers"
          :key="m.id"
          class="flex items-center gap-3 py-3"
          :class="i < sortedMembers.length - 1 ? 'border-b border-divider' : ''"
        >
          <!-- Avatar with online dot -->
          <div class="relative shrink-0">
            <div
              class="rounded-full flex items-center justify-center font-display font-bold w-10.5 h-10.5 border border-divider text-[17px]"
              :style="{ background: avatarBg(m), color: avatarFg(m) }"
            >{{ m.name.charAt(0).toUpperCase() }}</div>
            <div
              v-if="m.online"
              class="absolute bottom-0 right-0 w-2.75 h-2.75 rounded-full bg-success shadow-[0_0_0_2px_#06070D]"
            />
          </div>

          <!-- Name + deck -->
          <div class="grow min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-display font-bold text-body-lg tracking-[-0.015em] text-fg-0">{{ m.you ? t('playgroups.youSuffix', { name: m.name }) : m.name }}</span>

              <!-- Owner badge -->
              <span
                v-if="m.isOwner"
                class="flex items-center gap-1 font-bold text-[9.5px] text-crown tracking-wide uppercase py-0.5 px-1.5 pl-1.25 bg-crown-wash-d rounded-md leading-none"
              >
                <SbIcon name="crown" :size="9" :stroke="2.6" color="#F4B942" />
                {{ t('playgroups.manage.owner') }}
              </span>

              <!-- Admin badge -->
              <span
                v-else-if="m.role === 'admin'"
                class="font-bold text-[9.5px] text-arcane-2 tracking-wide uppercase py-0.5 px-1.5 bg-arcane/12 rounded-md leading-snug"
              >{{ t('playgroups.manage.admin') }}</span>
            </div>

            <div v-if="m.mainDeck" class="text-caption text-fg-2 mt-0.75 truncate italic">{{ m.mainDeck }}</div>
          </div>

          <!-- More button -->
          <button
            class="flex items-center justify-center border shrink-0 w-8 h-8 rounded-full bg-overlay-1 border-divider"
            :class="m.isOwner ? 'text-fg-3 cursor-not-allowed' : 'text-fg-1 cursor-pointer'"
            :disabled="m.isOwner"
            :aria-label="t('playgroups.manage.actionsFor', { name: m.name })"
            @click="!m.isOwner && openMenu(m.id)"
          >
            <SbIcon name="more" :size="16" />
          </button>
        </div>
      </div>

      <!-- Disband zone -->
      <div class="flex items-start gap-2.5 mt-8 mx-5 mb-6 p-3.5 bg-danger/5 border border-danger/18 rounded-lg">
        <div class="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-danger/12 text-danger">
          <SbIcon name="flame" :size="14" color="#F87171" />
        </div>

        <div class="grow min-w-0">
          <div class="font-body font-bold text-body-sm text-fg-0 leading-tight">{{ t('playgroups.manage.disbandTitle', { name: playgroup?.name }) }}</div>
          <div class="text-caption text-fg-2 mt-0.75 leading-snug">
            {{ t('playgroups.manage.disbandSub') }}
          </div>
        </div>

        <button
          class="font-body font-bold cursor-pointer border shrink-0 self-center h-8 px-3 bg-transparent text-danger border-danger/33 rounded-[8px] text-[11.5px] tracking-[0.04em] uppercase"
        >{{ t('playgroups.manage.disband') }}</button>
      </div>

      <div class="h-6" />
    </div>

    <!-- Bottom nav -->
    <SbBottomNav active="pods" @change="onNav" />

    <!-- Member action sheet -->
    <!-- Scrim -->
    <div
      class="fixed inset-0 z-30 transition-[background] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      :class="sheetOpen ? 'bg-[rgba(6,7,13,0.62)] pointer-events-auto backdrop-blur-[3px]' : 'bg-transparent pointer-events-none'"
      @click="sheetOpen = false"
    />

    <!-- Sheet panel -->
    <div
      class="fixed bottom-0 left-0 right-0 z-40 bg-bg-1/96 backdrop-blur-[20px] backdrop-saturate-140 rounded-t-3xl border-t border-white/10 shadow-[0_-16px_40px_rgba(0,0,0,0.55)] pt-2.5 pb-4.5 transition-transform duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      :inert="!sheetOpen"
      :class="sheetOpen ? 'translate-y-0' : 'translate-y-full'"
    >
      <!-- Drag handle -->
      <div class="w-9 h-1 rounded-full mx-auto bg-overlay-5 mb-3.5" />

      <template v-if="sheetMember">
        <!-- Sheet header -->
        <div class="flex items-center gap-3 pt-1 pb-3.5 px-5">
          <div class="relative shrink-0">
            <div
              class="rounded-full flex items-center justify-center font-display font-bold w-11 h-11 border border-divider text-stat"
              :style="{ background: avatarBg(sheetMember), color: avatarFg(sheetMember) }"
            >{{ sheetMember.name.charAt(0).toUpperCase() }}</div>
          </div>
          <div class="grow min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-display font-bold text-[17px] tracking-tight text-fg-0">{{ sheetMember.you ? t('playgroups.youSuffix', { name: sheetMember.name }) : sheetMember.name }}</span>
              <!-- Role badge in sheet -->
              <span
                v-if="sheetMember.isOwner"
                class="flex items-center gap-1 font-bold text-[9.5px] text-crown tracking-wide uppercase py-0.5 px-1.5 pl-1.25 bg-crown-wash-d rounded-md leading-none"
              >
                <SbIcon name="crown" :size="9" :stroke="2.6" color="#F4B942" />
                {{ t('playgroups.manage.owner') }}
              </span>
              <span
                v-else-if="sheetMember.role === 'admin'"
                class="font-bold text-[9.5px] text-arcane-2 tracking-wide uppercase py-0.5 px-1.5 bg-arcane/12 rounded-md leading-snug"
              >{{ t('playgroups.manage.admin') }}</span>
            </div>
            <div class="truncate text-caption text-fg-3 mt-0.5">{{ t('playgroups.manage.joinedLine', { date: formatFounded(sheetMember.joinedAt), games: t('playgroups.gamesCount', sheetMember.games) }) }}</div>
          </div>
        </div>

        <div class="divider-hairline mx-5 mb-1" />

        <!-- Actions -->
        <div class="flex flex-col">
          <!-- Promote to admin (member only) -->
          <button
            v-if="sheetMember.role === 'member'"
            class="flex items-center gap-3.5 border-0 cursor-pointer text-left w-full py-3.5 px-4 bg-transparent text-fg-0"
            @click="handleAction('promote', sheetMember.id)"
          >
            <div class="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-hairline">
              <SbIcon name="crown" :size="15" color="#C4C1D8" />
            </div>
            <div class="grow min-w-0">
              <div class="font-body font-semibold text-[14.5px] tracking-snug">{{ t('playgroups.manage.promoteTitle') }}</div>
              <div class="text-caption text-fg-3 mt-0.5">{{ t('playgroups.manage.promoteSub') }}</div>
            </div>
          </button>

          <!-- Demote to member (admin only, not owner) -->
          <button
            v-if="sheetMember.role === 'admin' && !sheetMember.isOwner"
            class="flex items-center gap-3.5 border-0 cursor-pointer text-left w-full py-3.5 px-4 bg-transparent text-fg-0"
            @click="handleAction('demote', sheetMember.id)"
          >
            <div class="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-hairline">
              <SbIcon name="crown" :size="15" color="#C4C1D8" />
            </div>
            <div class="grow min-w-0">
              <div class="font-body font-semibold text-[14.5px] tracking-snug">{{ t('playgroups.manage.demoteTitle') }}</div>
              <div class="text-caption text-fg-3 mt-0.5">{{ t('playgroups.manage.demoteSub') }}</div>
            </div>
          </button>

          <!-- Transfer ownership (only shown to the current owner, for non-owner members) -->
          <button
            v-if="isCurrentUserOwner && !sheetMember.isOwner"
            class="flex items-center gap-3.5 border-0 cursor-pointer text-left w-full py-3.5 px-4 bg-transparent text-fg-0"
            @click="handleAction('transfer', sheetMember.id)"
          >
            <div class="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-hairline">
              <SbIcon name="arrow" :size="15" color="#C4C1D8" />
            </div>
            <div class="grow min-w-0">
              <div class="font-body font-semibold text-[14.5px] tracking-snug">{{ t('playgroups.manage.transferTitle') }}</div>
              <div class="text-caption text-fg-3 mt-0.5">{{ t('playgroups.manage.transferSub') }}</div>
            </div>
          </button>

          <!-- Edit nickname -->
          <button
            class="flex items-center gap-3.5 border-0 cursor-pointer text-left w-full py-3.5 px-4 bg-transparent text-fg-0"
            @click="sheetOpen = false"
          >
            <div class="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-hairline">
              <SbIcon name="edit" :size="15" color="#C4C1D8" />
            </div>
            <div class="grow min-w-0">
              <div class="font-body font-semibold text-[14.5px] tracking-snug">{{ t('playgroups.manage.editNicknameTitle') }}</div>
              <div class="text-caption text-fg-3 mt-0.5">{{ t('playgroups.manage.editNicknameSub') }}</div>
            </div>
          </button>

          <div class="divider-hairline mx-5 my-1.5" />

          <!-- Remove -->
          <button
            class="flex items-center gap-3.5 border-0 text-left w-full py-3.5 px-4 bg-transparent text-danger cursor-pointer"
            @click="handleAction('remove', sheetMember.id)"
          >
            <div class="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-danger/12">
              <SbIcon name="x" :size="15" color="#F87171" />
            </div>
            <div class="grow min-w-0">
              <div class="font-body font-semibold text-[14.5px] tracking-snug">{{ t('playgroups.manage.removeTitle', { name: sheetMember.name }) }}</div>
              <div class="text-caption text-fg-3 mt-0.5">{{ t('playgroups.manage.removeSub') }}</div>
            </div>
          </button>
        </div>

        <!-- Cancel -->
        <button
          class="font-body font-bold cursor-pointer border mt-3.5 mx-5 w-[calc(100%-40px)] h-12 bg-overlay-1 text-fg-0 border-divider rounded-lg text-body"
          @click="sheetOpen = false"
        >{{ t('common.cancel') }}</button>
      </template>
    </div>

    <!-- Toast -->
    <div
      class="fixed left-4 right-4 z-50 bottom-6 bg-bg-1/92 backdrop-blur-md border border-overlay-2 rounded-lg py-3 px-3.5 flex items-center gap-2.5 text-fg-0 text-body-sm font-semibold shadow-[0_12px_32px_rgba(0,0,0,0.5)] pointer-events-none transition-[transform,opacity] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      :class="toast ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'"
    >
      <div class="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-tide-wash text-tide-2">
        <SbIcon name="check" :size="13" :stroke="2.6" color="#2DD4BF" />
      </div>
      <span class="grow">{{ toast ?? '' }}</span>
    </div>
  </div>
</template>
