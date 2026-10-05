<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useNav } from "@/composables/useNav";
import { useClickOutside } from "@/composables/useClickOutside";
import SbBottomNav from "@/components/ui/SbBottomNav.vue";
import SbChip from "@/components/ui/SbChip.vue";
import SbIcon from "@/components/ui/SbIcon.vue";
import DeckRow from "@/components/decks/DeckRow.vue";
import DecksEmptyState from "@/components/decks/DecksEmptyState.vue";
import { useDeckStore } from "@/stores/useDeckStore";
import type { DeckListItem } from "@/stores/useDeckStore";

const store = useDeckStore();
const { t } = useI18n();

onMounted(() => {
  store.fetchDecks();
});

// ─── State ────────────────────────────────────────────────────────────────────

type FilterId = "all" | "archived";
type SortId = "wins" | "winrate" | "name";

const FILTERS: { id: FilterId }[] = [{ id: "all" }, { id: "archived" }];

const SORTS: { id: SortId }[] = [{ id: "wins" }, { id: "winrate" }, { id: "name" }];

const activeFilter = ref<FilterId>("all");
const activeSort   = ref<SortId>("wins");
const sortOpen     = ref(false);
const sortMenuRef  = ref<HTMLElement | null>(null);

useClickOutside(sortMenuRef, () => { sortOpen.value = false });

// ─── Derived ──────────────────────────────────────────────────────────────────

const allDecks = computed<DeckListItem[]>(() => store.decks ?? []);

const counts = computed(() => ({
  all:      allDecks.value.filter((d) => !d.isArchived).length,
  archived: allDecks.value.filter((d) => d.isArchived).length,
}));

const filtered = computed<DeckListItem[]>(() => {
  const list = activeFilter.value === "archived"
    ? allDecks.value.filter((d) => d.isArchived)
    : allDecks.value.filter((d) => !d.isArchived);

  const wr = (d: DeckListItem) =>
    d.wins + d.losses === 0 ? 0 : d.wins / (d.wins + d.losses);

  switch (activeSort.value) {
    case "winrate": return [...list].sort((a, b) => wr(b) - wr(a));
    case "name":    return [...list].sort((a, b) => a.name.localeCompare(b.name));
    default:        return [...list].sort((a, b) => b.wins - a.wins);
  }
});

const currentSortLabel = computed(() => t("decks.sorts." + activeSort.value));

// ─── Navigation ───────────────────────────────────────────────────────────────

const router = useRouter();
const { onNav } = useNav();
</script>

<template>
  <div class="h-screen bg-bg-0 text-fg-0 overflow-hidden">
    <!-- Scrollable content -->
    <div class="h-full overflow-y-auto overflow-x-hidden pt-13 pb-27.5">
      <!-- Header -->
      <div class="px-5 pt-3 pb-4.5 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h1
            class="font-display font-bold text-fg-0 m-0 text-[32px] tracking-[-0.03em] leading-[1.05]"
          >
            {{ t("decks.title") }}
          </h1>
          <div class="text-body-sm text-fg-2 mt-2">
            <span class="text-fg-0 font-semibold">{{ t("decks.active", { count: counts.all }) }}</span>
          </div>
        </div>
        <button
          class="flex items-center gap-1.5 border-0 font-bold text-body-sm font-body text-white cursor-pointer shrink-0 whitespace-nowrap h-10 px-3.5 bg-arcane rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          @click="router.push('/decks/add')"
        >
          <SbIcon name="plus" :size="14" :stroke="2.4" />
          {{ t("decks.addDeck") }}
        </button>
      </div>

      <!-- Filter chips -->
      <div class="flex gap-1.5 pb-3.5 px-5 overflow-x-auto scrollbar-none">
        <SbChip
          v-for="f in FILTERS"
          :key="f.id"
          :active="activeFilter === f.id"
          class="shrink-0"
          @click="activeFilter = f.id"
        >
          {{ t("decks.filters." + f.id) }}
          <span
            v-if="counts[f.id] !== undefined"
            class="text-[10.5px] font-bold"
            :class="activeFilter === f.id ? 'text-white/70' : 'text-fg-3'"
            >{{ counts[f.id] }}</span
          >
        </SbChip>
      </div>

      <!-- Count + sort row -->
      <div class="px-5 pb-3.5 flex items-center justify-between">
        <div class="text-eyebrow-label">
          {{ t("decks.count", filtered.length) }}
        </div>

        <!-- Sort menu -->
        <div ref="sortMenuRef" class="relative" data-sort-menu>
          <button
            class="flex items-center gap-1 bg-transparent border-0 cursor-pointer font-body font-semibold py-1.5 px-2 text-caption text-fg-2"
            @click.stop="sortOpen = !sortOpen"
          >
            <span class="text-fg-3">{{ t("decks.sortBy") }}</span>
            <span class="text-fg-0">{{ currentSortLabel }}</span>
            <div class="flex rotate-90">
              <SbIcon name="chevron" :size="12" color="#8A88A3" :stroke="2.2" />
            </div>
          </button>

          <!-- Dropdown -->
          <div
            v-if="sortOpen"
            class="absolute right-0 top-[calc(100%+6px)] border border-white/10 rounded-xl z-10 flex flex-col min-w-40 bg-bg-2 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
          >
            <button
              v-for="s in SORTS"
              :key="s.id"
              class="flex items-center justify-between border-0 cursor-pointer font-body font-semibold text-fg-0 rounded-lg py-2.25 px-3 text-body-sm text-left bg-transparent hover:bg-bg-3"
              @click.stop="
                activeSort = s.id;
                sortOpen = false;
              "
            >
              {{ t("decks.sorts." + s.id) }}
              <SbIcon
                v-if="s.id === activeSort"
                name="check"
                :size="14"
                color="#A78BFA"
                :stroke="2.4"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Deck list or empty state -->
      <div class="px-5 pb-4">
        <div v-if="store.loading" class="flex flex-col gap-2.5">
          <div v-for="n in 3" :key="n" class="h-28 rounded-2xl bg-bg-1 animate-pulse" />
        </div>
        <DecksEmptyState
          v-else-if="filtered.length === 0"
          :filter="activeFilter"
          @add="router.push('/decks/add')"
        />
        <div v-else class="flex flex-col gap-2.5">
          <DeckRow
            v-for="deck in filtered"
            :key="deck.id"
            :deck="deck"
            density="comfortable"
            @open="router.push(`/decks/${deck.id}`)"
          />
        </div>
      </div>
    </div>

    <!-- Bottom nav -->
    <SbBottomNav active="decks" @change="onNav" />
  </div>
</template>
