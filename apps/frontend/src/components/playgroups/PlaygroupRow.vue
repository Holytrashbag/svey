<script setup lang="ts">
import PodMemberStack from "@/components/home/PodMemberStack.vue";
import type { PodMember } from "@/components/home/PodMemberStack.vue";
import SbIcon from "@/components/ui/SbIcon.vue";
import RecordBar from "./RecordBar.vue";
import { useFormat } from "@/composables/useFormat";
import { useI18n } from "vue-i18n";

const { relative } = useFormat();
const { t } = useI18n();

defineProps<{
  pod: {
    name: string;
    members: PodMember[];
    lastPlayed: string | null;
    record: { wins: number; losses: number };
    unreadGames?: number;
  };
}>();

defineEmits<{ open: [] }>();
</script>

<template>
  <button
    class="block w-full text-left bg-bg-1 border border-white/6 cursor-pointer text-fg-0 font-body pt-4 pb-3.5 px-4 rounded-2xl"
    @click="$emit('open')"
  >
    <div class="flex items-start gap-2.5">
      <div class="flex-1 min-w-0">
        <div
          class="font-display font-bold text-fg-0 truncate text-stat tracking-tight leading-[1.15]"
        >
          {{ pod.name }}
        </div>
        <div class="flex items-center gap-2 mt-2">
          <PodMemberStack :members="pod.members" :size="22" :max="4" ring-color="#06070D" />
          <div class="text-caption text-fg-2">
            {{ t('playgroups.players', pod.members.length) }}
            <span class="text-fg-4 mx-1.5">·</span>
            <span class="text-fg-3">{{ relative(pod.lastPlayed) }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div
          v-if="pod.unreadGames && pod.unreadGames > 0"
          class="min-w-[18px] h-[18px] rounded-full bg-arcane text-white flex items-center justify-center font-bold font-body text-[10px] px-1.5"
        >
          {{ pod.unreadGames }}
        </div>
        <SbIcon name="chevron" :size="16" color="#5A586E" />
      </div>
    </div>
    <div class="mt-3.5">
      <RecordBar :wins="pod.record.wins" :losses="pod.record.losses" />
    </div>
  </button>
</template>
