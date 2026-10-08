<script setup lang="ts">
import { useId } from "vue";
import { useI18n } from "vue-i18n";

defineProps<{
  wins: number;
  winrate: number | null;
  threat: number;
  playgroupName: string;
}>();

const { t } = useI18n();
const labelId = useId();
const subId = useId();
</script>

<template>
  <div>
    <div class="px-5 pb-4 text-[10px] text-fg-3 uppercase tracking-eyebrow font-semibold">
      {{ t("home.season.title", { name: playgroupName }) }}
    </div>
    <div class="grid grid-cols-3 gap-2 px-5">
      <!-- Wins — crown gold -->
      <div class="bg-bg-1 p-4 rounded-2xl">
        <div
          class="font-display font-bold text-crown tabular-nums text-[30px] tracking-[-0.03em] leading-none"
        >
          {{ wins }}
        </div>
        <div class="text-[10px] text-fg-3 uppercase tracking-eyebrow font-semibold mt-2">{{ t("home.season.wins") }}</div>
      </div>
      <!-- Winrate — neutral white -->
      <div class="bg-bg-1 p-4 rounded-2xl" role="group" :aria-labelledby="`${labelId} ${subId}`">
        <div
          class="font-display font-bold text-fg-0 tabular-nums text-[30px] tracking-[-0.03em] leading-none"
        >
          <template v-if="winrate === null">—</template>
          <template v-else>{{ winrate }}<span class="text-[16px] text-fg-3 ml-0.5 font-medium">%</span></template>
        </div>
        <div :id="labelId" class="text-[10px] text-fg-3 uppercase tracking-eyebrow font-semibold mt-2">
          {{ t("home.season.winShare") }}
        </div>
        <div :id="subId" class="text-[10px] text-fg-4 font-medium mt-0.5">{{ t("home.season.allPods") }}</div>
      </div>
      <!-- Threat — arcane purple -->
      <div class="bg-bg-1 p-4 rounded-2xl">
        <div
          class="font-display font-bold text-arcane-2 tabular-nums text-[30px] tracking-[-0.03em] leading-none"
        >
          {{ threat }}
        </div>
        <div class="text-[10px] text-fg-3 uppercase tracking-eyebrow font-semibold mt-2">
          {{ t("home.season.threat") }}
        </div>
      </div>
    </div>
  </div>
</template>
