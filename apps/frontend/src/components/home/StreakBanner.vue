<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SbIcon from '@/components/ui/SbIcon.vue'

defineProps<{ streak: number }>()

const { t } = useI18n()
</script>

<template>
  <div class="px-5 flex items-center gap-2.5 text-[13px]">
    <div class="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 text-crown bg-crown-wash-d">
      <SbIcon name="flame" :size="13" :stroke="2" />
    </div>
    <div class="text-fg-1">
      <span class="text-fg-0 font-semibold">{{ t('home.streak.label', { n: streak }) }}</span>
      <span class="text-fg-3 mx-1.5">·</span>
      <span class="text-fg-2">{{ t('home.streak.quip') }}</span>
    </div>
  </div>
</template>
