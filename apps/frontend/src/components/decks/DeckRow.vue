<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import SbColorSpine from "@/components/ui/SbColorSpine.vue";
import SbBracketBar from "@/components/ui/SbBracketBar.vue";
import SbPip from "@/components/ui/SbPip.vue";
import type { MtgColor } from "@/components/ui/SbPip.vue";

const { t } = useI18n();

export interface Deck {
  id: string;
  name: string;
  commander: string | null;
  colorIdentity: string[];
  bracket: number;
  wins: number;
  losses: number;
  isArchived: boolean;
}

const props = withDefaults(
  defineProps<{
    deck: Deck;
    density?: "comfortable" | "compact";
  }>(),
  { density: "comfortable" },
);

defineEmits<{ open: [] }>();

const total = computed(() => props.deck.wins + props.deck.losses);
const winrate = computed(() =>
  total.value > 0 ? Math.round((props.deck.wins / total.value) * 100) : 0,
);
const recordPct = computed(() => (total.value > 0 ? (props.deck.wins / total.value) * 100 : 0));
const comfortable = computed(() => props.density === "comfortable");
</script>

<template>
  <button
    class="flex w-full text-left border border-divider cursor-pointer text-fg-0 font-body gap-3.5 items-stretch bg-bg-1 rounded-2xl"
    :class="[comfortable ? 'p-4' : 'p-3.5', deck.isArchived ? 'opacity-55' : 'opacity-100']"
    @click="$emit('open')"
  >
    <SbColorSpine :colors="deck.colorIdentity as MtgColor[]" />

    <div class="flex-1 min-w-0 flex flex-col" :class="comfortable ? 'gap-2' : 'gap-1.5'">
      <!-- Name + commander -->
      <div>
        <div
          class="font-display font-bold text-fg-0 truncate tracking-tight leading-[1.15]"
          :class="comfortable ? 'text-[17px]' : 'text-[16px]'"
        >
          {{ deck.name }}
        </div>
        <div v-if="deck.commander" class="text-[12.5px] italic truncate mt-0.5 text-fg-2">
          {{ deck.commander }}
        </div>
      </div>

      <!-- Meta: pips · bracket -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <div class="flex gap-1">
          <SbPip v-for="c in deck.colorIdentity as MtgColor[]" :key="c" :color="c" :size="10" />
        </div>
        <span class="text-fg-4">·</span>
        <div class="inline-flex items-center gap-1.5">
          <SbBracketBar :level="deck.bracket" />
          <span class="text-caption font-semibold text-arcane-2">{{ t("decks.row.bracket", { n: deck.bracket }) }}</span>
        </div>
      </div>

      <!-- Record row -->
      <div class="flex items-center gap-3" :class="comfortable ? 'mt-1' : 'mt-0.5'">
        <!-- Wins + winrate -->
        <div class="flex items-baseline gap-1">
          <span class="font-display font-bold text-fg-0 text-stat tracking-tight tabular-nums">{{
            deck.wins
          }}</span>
          <span class="text-meta font-semibold text-fg-3">W</span>
          <span class="text-fg-4 mx-1">·</span>
          <span class="font-mono text-caption font-semibold text-fg-1">{{ winrate }}%</span>
        </div>

        <!-- Mini record bar -->
        <div class="flex-1 h-1 rounded-full bg-bg-2 overflow-hidden relative">
          <div class="absolute inset-y-0 left-0 bg-crown" :style="{ width: `${recordPct}%` }" />
        </div>

        <!-- Games played -->
        <span class="font-mono shrink-0 whitespace-nowrap text-[10.5px] text-fg-3"
          >{{ t("decks.row.games", deck.wins + deck.losses) }}</span
        >
      </div>
    </div>
  </button>
</template>
