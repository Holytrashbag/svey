<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNav } from '@/composables/useNav'
import SbBottomNav from '@/components/ui/SbBottomNav.vue'
import SbIcon from '@/components/ui/SbIcon.vue'
import SbTabStrip from '@/components/ui/SbTabStrip.vue'
import PlaygroupDetailHero from '@/components/playgroups/PlaygroupDetailHero.vue'
import PlaygroupStandingRow from '@/components/playgroups/PlaygroupStandingRow.vue'
import PlaygroupMemberCard from '@/components/playgroups/PlaygroupMemberCard.vue'
import PlaygroupHistoryRow from '@/components/playgroups/PlaygroupHistoryRow.vue'
import PlaygroupInviteSheet from '@/components/playgroups/PlaygroupInviteSheet.vue'
import { usePlaygroupStore } from '@/stores/usePlaygroupStore'
import SbSpinner from '@/components/ui/SbSpinner.vue'
import { useFormat } from '@/composables/useFormat'
import { sortStandings } from '@/lib/pod-standings'
import { useI18n } from 'vue-i18n'

const { relative: formatRelativeTime, founded: formatFounded } = useFormat()
const { t } = useI18n()

// ─── Store / route ────────────────────────────────────────────────────────────

const store  = usePlaygroupStore()
const route  = useRoute()
const router = useRouter()

const playgroupId = route.params.id as string

onMounted(() => store.fetchPlaygroupDetail(playgroupId))

const pod = computed(() => store.currentPlaygroup)

// ─── Computed helpers ─────────────────────────────────────────────────────────

const myRole = computed<'admin' | 'member'>(() =>
  pod.value?.members.find(m => m.you)?.role ?? 'member',
)

const sortedMembers = computed(() =>
  pod.value ? sortStandings(pod.value.members) : [],
)

const memberById = (id: string) => pod.value?.members.find(m => m.id === id)

const historyGroups = computed(() => {
  if (!pod.value) return []
  const now = Date.now()
  const oneWeek  = 7  * 24 * 60 * 60 * 1000
  const twoWeeks = 14 * 24 * 60 * 60 * 1000
  const thisWeek:  typeof pod.value.recent = []
  const lastTwo:   typeof pod.value.recent = []
  const older:     typeof pod.value.recent = []
  for (const g of pod.value.recent) {
    const age = now - new Date(g.when).getTime()
    if (age <= oneWeek)  thisWeek.push(g)
    else if (age <= twoWeeks) lastTwo.push(g)
    else older.push(g)
  }
  return [
    { label: t('playgroups.detail.historyThisWeek'), games: thisWeek },
    { label: t('playgroups.detail.historyLastTwo'),  games: lastTwo  },
    { label: t('playgroups.detail.historyOlder'),    games: older    },
  ].filter(g => g.games.length > 0)
})

// ─── Member removal ───────────────────────────────────────────────────────────

async function removeMember(memberId: string) {
  if (!pod.value) return
  await store.removeMember(pod.value.id, memberId)
}

// ─── UI state ─────────────────────────────────────────────────────────────────

const activeTab = ref<'overview' | 'members' | 'history'>('overview')
const inviteOpen = ref(false)

const tabs = computed(() => [
  { id: 'overview', label: t('playgroups.detail.tabs.overview') },
  { id: 'members',  label: t('playgroups.detail.tabs.members')  },
  { id: 'history',  label: t('playgroups.detail.tabs.history')  },
])

// ─── Navigation ───────────────────────────────────────────────────────────────

const { onNav } = useNav()
</script>

<template>
  <div class="h-screen bg-bg-0 text-fg-0 overflow-hidden">
    <div class="h-full overflow-y-auto overflow-x-hidden pt-13 pb-27.5">

      <!-- Header chrome -->
      <div class="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <button
          class="flex items-center justify-center border-0 bg-transparent text-fg-1 cursor-pointer w-9 h-9 rounded-full"
          @click="router.back()"
        >
          <SbIcon name="back" :size="20" />
        </button>

        <div class="flex items-center gap-1">
          <div
            v-if="myRole === 'admin'"
            class="inline-flex items-center py-1 px-2.25 rounded-full bg-crown-wash-d text-crown text-[10px] font-bold tracking-wide uppercase mr-1"
          >{{ t('playgroups.detail.admin') }}</div>
          <button
            class="flex items-center justify-center border-0 bg-transparent text-fg-1 cursor-pointer w-9 h-9 rounded-full"
          >
            <SbIcon name="more" :size="20" />
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.detailLoading" class="flex items-center justify-center py-8">
        <SbSpinner />
      </div>
      <div v-else-if="store.detailError" class="px-5 pt-8 text-danger text-body-sm">{{ store.detailError }}</div>

      <template v-else-if="pod">
        <!-- Hero -->
        <div class="mb-5">
          <PlaygroupDetailHero
            :name="pod.name"
            :founded="formatFounded(pod.founded)"
            :members="pod.members"
            :role="myRole"
            @invite="inviteOpen = true"
            @settings="router.push(`/pods/${pod.id}/members`)"
          />
        </div>

        <!-- Tab strip -->
        <SbTabStrip
          :tabs="tabs"
          :active="activeTab"
          @change="(id) => activeTab = id as typeof activeTab"
        />

        <!-- Tab content -->
        <div class="pb-8">

          <!-- Overview -->
          <template v-if="activeTab === 'overview'">

            <!-- Stats strip -->
            <div class="grid grid-cols-3 gap-5 px-5 pt-5">
              <div
                v-for="tile in [
                  { value: pod.totalGames, label: t('playgroups.detail.tiles.games')     },
                  { value: pod.thisMonth,  label: t('playgroups.detail.tiles.thisMonth') },
                  { value: pod.avgLength,  label: t('playgroups.detail.tiles.avgMin')    },
                ]"
                :key="tile.label"
              >
                <div class="font-display font-bold text-fg-0 text-[26px] tracking-[-0.03em] leading-none tabular-nums">{{ tile.value }}</div>
                <div class="text-eyebrow-label mt-2">{{ tile.label }}</div>
              </div>
            </div>

            <!-- New game CTA -->
            <div class="px-5 pt-5">
              <button
                class="w-full h-12 rounded-lg bg-arcane text-white border-0 font-body font-bold text-body tracking-snug cursor-pointer inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                @click="router.push(`/pods/${pod.id}/game`)"
              >
                <SbIcon name="plus" :size="16" :stroke="2.4" />
                {{ t('playgroups.detail.newGame') }}
              </button>
            </div>

            <!-- Standings -->
            <div class="px-5 pt-8 pb-2 flex items-baseline justify-between">
              <div class="text-eyebrow-label">{{ t('playgroups.detail.standingsSeason') }}</div>
              <button class="bg-transparent border-0 font-semibold cursor-pointer text-caption text-fg-2">{{ t('playgroups.detail.allTime') }}</button>
            </div>
            <div class="px-5">
              <PlaygroupStandingRow
                v-for="(m, i) in sortedMembers"
                :key="m.id"
                :rank="i + 1"
                :name="m.name"
                :wins="m.wins"
                :winrate="m.winRate"
                :bar-width="m.winRate ?? 0"
                :you="m.you"
                :avatar-url="m.avatarUrl"
              />
            </div>

            <!-- Recent games -->
            <div class="px-5 pt-8 pb-2 flex items-baseline justify-between">
              <div class="text-eyebrow-label">{{ t('playgroups.detail.recentGames') }}</div>
              <button
                class="bg-transparent border-0 font-semibold cursor-pointer text-caption text-fg-2"
                @click="activeTab = 'history'"
              >{{ t('playgroups.detail.viewAll') }}</button>
            </div>
            <div class="px-5">
              <PlaygroupHistoryRow
                v-for="(game, i) in pod.recent.slice(0, 3)"
                :key="game.id"
                :game-id="game.id"
                :winner-name="memberById(game.winnerId)?.name ?? game.winnerId"
                :deck="game.deck"
                :when="formatRelativeTime(game.when)"
                :duration="game.duration"
                :won-by-you="memberById(game.winnerId)?.you"
                :is-last="i === 2"
                @open="router.push(`/games/${game.id}`)"
              />
            </div>
          </template>

          <!-- Members -->
          <template v-if="activeTab === 'members'">
            <div class="px-5 pt-5 pb-3">
              <div class="text-eyebrow-label">{{ t('playgroups.detail.roster', pod.members.length) }}</div>
            </div>
            <div class="px-5 flex flex-col gap-2.5">
              <PlaygroupMemberCard
                v-for="m in pod.members"
                :key="m.id"
                :name="m.name"
                :online="m.online"
                :role="m.role"
                :main-deck="m.mainDeck ?? '—'"
                :wins="m.wins"
                :winrate="m.winRate"
                :threat="m.threat"
                :you="m.you"
                :can-remove="myRole === 'admin' && !m.you"
                :avatar-url="m.avatarUrl"
                @remove="removeMember(m.id)"
              />
            </div>
          </template>

          <!-- History -->
          <template v-if="activeTab === 'history'">
            <div class="px-5 pt-5">
              <div class="text-eyebrow-label">{{ t('playgroups.detail.gameHistory', { total: pod.totalGames }) }}</div>
            </div>
            <div
              v-for="(group, gi) in historyGroups"
              :key="gi"
              class="mt-5"
            >
              <div class="px-5 pb-1 font-semibold text-meta text-fg-2">{{ group.label }}</div>
              <div class="px-5">
                <PlaygroupHistoryRow
                  v-for="(game, i) in group.games"
                  :key="game.id"
                  :game-id="game.id"
                  :winner-name="memberById(game.winnerId)?.name ?? game.winnerId"
                  :deck="game.deck"
                  :when="formatRelativeTime(game.when)"
                  :duration="game.duration"
                  :won-by-you="memberById(game.winnerId)?.you"
                  :is-last="i === group.games.length - 1"
                  @open="router.push(`/games/${game.id}`)"
                />
              </div>
            </div>
          </template>

        </div>
      </template>

    </div>

    <!-- Bottom nav -->
    <SbBottomNav active="pods" @change="onNav" />

    <!-- Invite sheet -->
    <PlaygroupInviteSheet
      v-if="pod"
      :open="inviteOpen"
      :pod-name="pod.name"
      :invite-code="pod.code"
      @close="inviteOpen = false"
    />
  </div>
</template>
