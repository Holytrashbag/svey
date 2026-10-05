<script setup lang="ts">
import { useI18n } from "vue-i18n";
import SbIcon from "./SbIcon.vue";
import type { IconName } from "./SbIcon.vue";

const props = defineProps<{
  active: string;
}>();

const emit = defineEmits<{
  change: [id: string];
}>();

const { t } = useI18n();

const items: { id: "home" | "decks" | "pods" | "you"; icon: IconName }[] = [
  { id: "home", icon: "home" },
  { id: "decks", icon: "decks" },
  { id: "pods", icon: "pods" },
  { id: "you", icon: "profile" },
];
</script>

<template>
  <nav
    class="fixed bottom-6 left-4 right-4 flex items-center p-1.5 rounded-2xl border border-white/6 backdrop-blur-[20px] backdrop-saturate-[140%] bg-bg-1/78 shadow-[0_12px_32px_rgba(0,0,0,0.5)] z-10"
  >
    <button
      v-for="item in items"
      :key="item.id"
      class="flex-1 flex flex-col items-center gap-0.5 py-2 cursor-pointer bg-transparent border-0 transition-colors duration-160"
      :class="props.active === item.id ? 'text-arcane-2' : 'text-fg-2'"
      @click="emit('change', item.id)"
    >
      <SbIcon :name="item.icon" :size="20" :stroke="props.active === item.id ? 2.2 : 1.8" />
      <span class="text-[10px] font-semibold tracking-[0.02em]">{{ t(`common.nav.${item.id}`) }}</span>
    </button>
  </nav>
</template>
