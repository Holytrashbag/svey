<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { authClient } from "@/lib/auth-client";
import { usePlaygroupStore } from "@/stores/usePlaygroupStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useFormat } from "@/composables/useFormat";
import { useNav } from "@/composables/useNav";
import { usePlaygroupStats } from "@/composables/usePlaygroupStats";
import SbBottomNav from "@/components/ui/SbBottomNav.vue";
import SbIcon from "@/components/ui/SbIcon.vue";
import SbAvatar from "@/components/ui/SbAvatar.vue";
import SbSpinner from "@/components/ui/SbSpinner.vue";
import PlaygroupHero from "@/components/home/PlaygroupHero.vue";
import SwitcherSheet from "@/components/home/SwitcherSheet.vue";
import NotificationSheet from "@/components/home/NotificationSheet.vue";
import StreakBanner from "@/components/home/StreakBanner.vue";
import SeasonStrip from "@/components/home/SeasonStrip.vue";
import HomeGameRow from "@/components/home/HomeGameRow.vue";
import OtherPlaygroups from "@/components/home/OtherPlaygroups.vue";

const { relative: formatRelativeTime } = useFormat();
const { t } = useI18n();

// ─── Session ──────────────────────────────────────────────────────────────────

const sessionRef = authClient.useSession();
const userName = computed(() => sessionRef.value?.data?.user?.name ?? t("home.defaultName"));
const userAvatarUrl = computed(() => sessionRef.value?.data?.user?.image ?? undefined);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return t("home.greeting.morning");
  if (h < 18) return t("home.greeting.afternoon");
  return t("home.greeting.evening");
});

// ─── Store ────────────────────────────────────────────────────────────────────

const store = usePlaygroupStore();
const isLoading = computed(() => store.loading || store.detailLoading);
const hasError = computed(() => !!(store.error || store.detailError));

// ─── Notifications ──────────────────────────────────────────────────────────

const notifStore = useNotificationStore();
const notifOpen = ref(false);

function openNotifications() {
  notifOpen.value = true;
  notifStore.markAllRead();
}

// ─── Playgroup state ──────────────────────────────────────────────────────────

const currentId = ref("");
const switcherOpen = ref(false);

const current = computed(() => store.currentPlaygroup);
const multi = computed(() => store.active.length > 1);

const currentActiveItem = computed(() => store.active.find((a) => a.id === currentId.value));

const heroLastPlayed = computed(() => formatRelativeTime(currentActiveItem.value?.lastPlayed ?? null));

const heroMembers = computed(
  () =>
    store.currentPlaygroup?.members.map((m) => ({
      name: m.name,
      online: m.online,
      you: m.you,
      avatarUrl: m.avatarUrl,
    })) ?? [],
);

// ─── Stats ────────────────────────────────────────────────────────────────────

const stats = usePlaygroupStats(current);

// Personal win rate across all pods: the same number the Profile page shows.
const profileStore = useProfileStore();
const personalWinRate = computed(() => profileStore.stats?.winRate ?? null);

// ─── Games ────────────────────────────────────────────────────────────────────

const games = computed(() => {
  const pg = store.currentPlaygroup;
  if (!pg) return [];
  return pg.recent.map((g) => ({
    id: g.id,
    winner: pg.members.find((m) => m.id === g.winnerId)?.name ?? t("home.unknownPlayer"),
    deck: g.deck,
    when: formatRelativeTime(g.when),
  }));
});

// ─── Switcher / other playgroups ──────────────────────────────────────────────

const switcherPlaygroups = computed(() =>
  store.active.map((a) => ({
    id: a.id,
    name: a.name,
    members: a.members.map((m) => ({ name: m.name, you: m.you, avatarUrl: m.avatarUrl })),
    games:
      a.id === currentId.value
        ? (store.currentPlaygroup?.totalGames ?? a.record.wins + a.record.losses)
        : a.record.wins + a.record.losses,
    lastPlayedRelative: formatRelativeTime(a.lastPlayed),
  })),
);

const otherPlaygroups = computed(() =>
  switcherPlaygroups.value.filter((p) => p.id !== currentId.value),
);

// ─── Actions ──────────────────────────────────────────────────────────────────

async function switchTo(id: string) {
  currentId.value = id;
  switcherOpen.value = false;
  await store.fetchPlaygroupDetail(id);
}

onMounted(async () => {
  notifStore.fetchNotifications();
  profileStore.fetchStats();
  await store.fetchMyPlaygroups();
  const first = store.active[0];
  if (first) {
    currentId.value = first.id;
    await store.fetchPlaygroupDetail(first.id);
  }
});

// ─── Navigation ───────────────────────────────────────────────────────────────

const router = useRouter();
const { onNav } = useNav();
</script>

<template>
  <div class="h-screen bg-bg-0 text-fg-0 overflow-hidden">
    <!-- Scrollable content -->
    <div class="h-full overflow-y-auto overflow-x-hidden pt-13 pb-27.5">
      <!-- Header -->
      <div class="px-5 pt-3 pb-8 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <SbAvatar :name="userName" :size="36" :you="true" :image-url="userAvatarUrl" />
          <div class="min-w-0">
            <div class="text-[10px] text-fg-3 uppercase tracking-widest font-semibold">
              {{ greeting }}
            </div>
            <div
              class="font-display font-bold text-fg-0 mt-0.5 text-[17px] tracking-tight leading-tight"
            >
              {{ userName }}
            </div>
          </div>
        </div>
        <!-- Bell — ghost, with a notification dot -->
        <button
          class="w-9 h-9 bg-transparent border-0 text-fg-2 flex items-center justify-center cursor-pointer relative"
          :aria-label="t('home.notificationsLabel')"
          @click="openNotifications"
        >
          <SbIcon name="bell" :size="20" />
          <div
            v-if="notifStore.hasUnread"
            class="absolute top-2 right-2 w-1.75 h-1.75 rounded-full bg-crown"
          />
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <SbSpinner />
      </div>

      <!-- Error state -->
      <div v-else-if="hasError" class="px-5 py-10 text-center text-fg-3 text-body-sm">
        {{ store.error || store.detailError }}
      </div>

      <!-- Empty state -->
      <div v-else-if="!current" class="px-5 py-10 text-center text-fg-3 text-body-sm">
        {{ t("home.empty") }}
      </div>

      <!-- Main content -->
      <template v-else>
        <!-- Active playgroup hero -->
        <div class="mb-9">
          <PlaygroupHero
            :name="current.name"
            :members="heroMembers"
            :last-played="heroLastPlayed"
            :multi="multi"
            @open-switcher="switcherOpen = true"
            @start-game="router.push(`/pods/${currentId}/game`)"
          />
        </div>

        <!-- Win streak banner -->
        <div v-if="stats.streak > 0" class="mb-8">
          <StreakBanner :streak="stats.streak" />
        </div>

        <!-- Season stats -->
        <div class="mb-10">
          <SeasonStrip
            :wins="stats.wins"
            :winrate="personalWinRate"
            :threat="stats.threat"
            :playgroup-name="current.name"
          />
        </div>

        <!-- Recent games -->
        <div v-if="games.length > 0" class="mb-9">
          <div class="flex items-baseline justify-between px-5 pb-1">
            <div class="text-[10px] text-fg-3 uppercase tracking-widest font-semibold">
              {{ t("home.recentGames") }}
            </div>
            <button
              class="bg-transparent border-0 text-fg-2 text-caption font-semibold cursor-pointer"
              @click="router.push(`/pods/${currentId}`)"
            >
              {{ t("home.viewAll") }}
            </button>
          </div>
          <div class="px-5">
            <HomeGameRow
              v-for="(game, i) in games"
              :key="game.id"
              :game-id="game.id"
              :winner="game.winner"
              :deck="game.deck"
              :when="game.when"
              :current-user="userName"
              :is-last="i === games.length - 1"
              @open="router.push(`/games/${game.id}`)"
            />
          </div>
        </div>

        <!-- Other playgroups -->
        <div v-if="multi">
          <OtherPlaygroups :playgroups="otherPlaygroups" @pick="switchTo" />
        </div>
      </template>
    </div>

    <!-- Bottom nav (fixed to viewport) -->
    <SbBottomNav active="home" @change="onNav" />

    <!-- Playgroup switcher sheet (fixed to viewport) -->
    <SwitcherSheet
      :open="switcherOpen"
      :playgroups="switcherPlaygroups"
      :current-id="currentId"
      @pick="switchTo"
      @close="switcherOpen = false"
      @create="switcherOpen = false"
    />

    <!-- Notifications sheet (fixed to viewport) -->
    <NotificationSheet
      :open="notifOpen"
      :notifications="notifStore.notifications"
      @close="notifOpen = false"
    />
  </div>
</template>
