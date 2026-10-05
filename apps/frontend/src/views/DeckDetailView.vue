<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useNav } from "@/composables/useNav";
import SbBottomNav from "@/components/ui/SbBottomNav.vue";
import SbIcon from "@/components/ui/SbIcon.vue";
import DeckDetailHero from "@/components/decks/DeckDetailHero.vue";
import DeckDetailBracket from "@/components/decks/DeckDetailBracket.vue";
import DeckDetailCards from "@/components/decks/DeckDetailCards.vue";
import DeckDetailStats from "@/components/decks/DeckDetailStats.vue";
import DeckDetailAbout from "@/components/decks/DeckDetailAbout.vue";
import type { MtgColor } from "@/components/ui/SbPip.vue";
import { useDeckStore } from "@/stores/useDeckStore";
import SbSpinner from "@/components/ui/SbSpinner.vue";
import { useFormat } from "@/composables/useFormat";
import { useI18n } from "vue-i18n";

const { relative: formatRelativeTime } = useFormat();
const { t } = useI18n();

// ─── Store + route ────────────────────────────────────────────────────────────

const router = useRouter();
const route = useRoute();
const store = useDeckStore();

const deckId = route.params.id as string;

onMounted(() => {
  store.fetchDeckDetail(deckId);
  store.fetchDeckStats(deckId);
});

// ─── State ────────────────────────────────────────────────────────────────────

type SyncState = "synced" | "syncing" | "error";
type TabId = "cards" | "stats" | "about";

const activeTab = ref<TabId>("cards");
const syncState = ref<SyncState>("synced");
const bracketOverride = ref(false);
const bracketValue = ref(1);

watch(
  () => store.activeDeck,
  (d) => {
    if (d) {
      bracketValue.value = d.bracketOverride ?? d.bracketEstimated;
      bracketOverride.value = d.bracketOverride !== null;
    }
  },
);

const totalCards = computed(() => store.activeDeck?.cards.reduce((s, c) => s + c.quantity, 0) ?? 0);

const displayCards = computed(
  () =>
    store.activeDeck?.cards.map((c) => ({
      type: c.isCommander ? "Commander" : c.cardType || "Other",
      qty: c.quantity,
      name: c.name,
      cost: c.manaCost.replace(/[{}]/g, ""),
      cmc: c.cmc,
      salt: c.saltScore > 1.5,
    })) ?? [],
);

const TABS: { id: TabId }[] = [{ id: "cards" }, { id: "stats" }, { id: "about" }];

// ─── Sync row ─────────────────────────────────────────────────────────────────

const SYNC_CFG = computed(() => ({
  synced: {
    dotClass: "bg-success",
    label: t("decks.detail.sync.synced"),
    sub: t("decks.detail.sync.syncedSub", { time: formatRelativeTime(store.activeDeck?.lastSyncedAt ?? null) }),
    action: t("decks.detail.sync.resync") as string | null,
    spin: false,
    isError: false,
  },
  syncing: {
    dotClass: "bg-crown",
    label: t("decks.detail.sync.syncing"),
    sub: t("decks.detail.sync.syncingSub"),
    action: null as string | null,
    spin: true,
    isError: false,
  },
  error: {
    dotClass: "bg-danger",
    label: t("decks.detail.sync.failed"),
    sub: t("decks.detail.sync.failedSub"),
    action: t("decks.detail.sync.retry") as string | null,
    spin: false,
    isError: true,
  },
}));

const syncCfg = computed(() => SYNC_CFG.value[syncState.value]);

// ─── Navigation ───────────────────────────────────────────────────────────────

const { onNav } = useNav();

async function onResync() {
  if (syncState.value === "syncing") return;
  syncState.value = "syncing";
  try {
    await store.syncDeck(deckId);
    syncState.value = "synced";
  } catch {
    syncState.value = "error";
  }
}

// ─── Bracket ──────────────────────────────────────────────────────────────────

function onBracketChange(n: number) {
  bracketValue.value = n;
  store.updateDeck(deckId, { bracketOverride: bracketOverride.value ? n : null });
}

function onToggleOverride() {
  bracketOverride.value = !bracketOverride.value;
  store.updateDeck(deckId, {
    bracketOverride: bracketOverride.value ? bracketValue.value : null,
  });
}
</script>

<template>
  <div class="relative h-screen bg-bg-0 text-fg-0 overflow-hidden">
    <!-- Header chrome: back button overlaid on hero art -->
    <div
      class="absolute left-0 right-0 z-10 flex items-center justify-between top-13 px-4 pointer-events-none"
    >
      <button
        class="flex items-center justify-center cursor-pointer border w-9 h-9 rounded-full bg-scrim-soft backdrop-blur-md border-overlay-2 text-fg-0 pointer-events-auto"
        @click="router.back()"
      >
        <SbIcon name="back" :size="18" />
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="h-full overflow-y-auto overflow-x-hidden pb-32">
      <!-- Loading state -->
      <div v-if="store.detailLoading" class="flex items-center justify-center h-64">
        <SbSpinner />
      </div>

      <template v-else-if="store.activeDeck">
        <!-- Hero -->
        <DeckDetailHero
          :deck="{
            name: store.activeDeck.name,
            commanders: store.activeDeck.cards
              .filter((c) => c.isCommander)
              .map((c) => ({ name: c.name, scryfallId: c.scryfallId })),
            colors: store.activeDeck.colorIdentity as MtgColor[],
            format: t('decks.format'),
            wins: store.deckStats?.mine?.wins ?? 0,
            losses: store.deckStats?.mine?.losses ?? 0,
            totalCards,
            saltSum: store.activeDeck.saltSum,
          }"
        />

        <!-- Sync status row -->
        <div class="mx-5 mb-3 py-3 px-3.5 card-surface flex items-center gap-3">
          <!-- Archidekt icon with status dot -->
          <div
            class="w-8 h-8 rounded-[9px] shrink-0 bg-bg-2 flex items-center justify-center relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-tide-2">
              <path
                d="M4 18 L12 4 L20 18 Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
              <path
                d="M8 18 L12 11 L16 18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
            <div
              class="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full shadow-[0_0_0_2px_#0E1120]"
              :class="[
                syncCfg.dotClass,
                syncCfg.spin ? 'animate-[ddPulse_1.2s_ease-in-out_infinite]' : '',
              ]"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="font-bold text-body-sm text-fg-0">{{ syncCfg.label }}</div>
            <div
              class="overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-fg-2 mt-0.5"
            >
              {{ syncCfg.sub }}
            </div>
          </div>

          <button
            v-if="syncCfg.action"
            class="font-body font-bold flex items-center shrink-0 border-0 cursor-pointer py-1.75 px-3 rounded-[9px] text-caption gap-1.25"
            :class="syncCfg.isError ? 'bg-danger/14 text-danger' : 'bg-bg-2 text-fg-1'"
            @click="onResync"
          >
            <SbIcon v-if="!syncCfg.isError" name="check" :size="12" :stroke="2.4" />
            {{ syncCfg.action }}
          </button>
        </div>

        <!-- Bracket widget -->
        <DeckDetailBracket
          :estimated="store.activeDeck.bracketEstimated"
          :value="bracketValue"
          :override="bracketOverride"
          @change="onBracketChange"
          @toggle-override="onToggleOverride"
        />

        <!-- Sticky tab strip -->
        <div
          class="sticky top-0 flex z-5 bg-scrim backdrop-blur-[20px] backdrop-saturate-140 border-b border-divider px-5 gap-1"
        >
          <button
            v-for="tab in TABS"
            :key="tab.id"
            class="relative bg-transparent border-0 cursor-pointer font-body font-bold inline-flex items-center pt-3.5 pb-3 px-1.5 text-[13.5px] gap-1.5 mr-2"
            :class="activeTab === tab.id ? 'text-fg-0' : 'text-fg-2'"
            @click="activeTab = tab.id"
          >
            {{ t('decks.detail.tabs.' + tab.id) }}
            <span
              v-if="tab.id === 'cards'"
              class="font-mono font-semibold text-[10px] py-px px-1.5 rounded-full bg-bg-2 text-fg-2"
              >{{ totalCards }}</span
            >
            <div
              v-if="activeTab === tab.id"
              class="absolute h-0.5 rounded-sm left-0 right-2 -bottom-px bg-arcane-2"
            />
          </button>
        </div>

        <!-- Tab content -->
        <div class="pt-4.5">
          <DeckDetailCards v-if="activeTab === 'cards'" :cards="displayCards" />
          <DeckDetailStats v-if="activeTab === 'stats'" :deck-id="deckId" />
          <DeckDetailAbout
            v-if="activeTab === 'about'"
            :deck="{
              format: t('decks.format'),
              totalCards,
              saltSum: store.activeDeck.saltSum,
              age: formatRelativeTime(store.activeDeck.createdAt),
              source: 'Archidekt',
              sourceUrl: store.activeDeck.archidektId
                ? `https://archidekt.com/decks/${store.activeDeck.archidektId}`
                : '',
            }"
            @archive="store.updateDeck(deckId, { isArchived: true })"
          />
        </div>
      </template>

      <!-- Error state -->
      <div
        v-else-if="store.detailError"
        class="flex items-center justify-center h-64 text-danger px-6 text-center"
      >
        {{ store.detailError }}
      </div>
    </div>

    <!-- Bottom nav -->
    <SbBottomNav active="decks" @change="onNav" />
  </div>
</template>
