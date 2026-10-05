<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineEmits<{ create: []; join: [] }>()
</script>

<template>
  <div class="py-6 px-1 text-center">
    <svg
      width="120"
      height="96"
      viewBox="0 0 120 96"
      class="mx-auto mb-4.5"
    >
      <g fill="none" stroke="#3A3A4D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="30" cy="38" r="14" />
        <circle cx="90" cy="38" r="14" />
        <circle cx="60" cy="68" r="14" />
        <circle cx="60" cy="20" r="6" stroke-dasharray="2 3" />
        <path d="M30 52v8M90 52v8M60 54v0" opacity="0.4" />
      </g>
    </svg>
    <div class="font-display font-bold text-fg-0 text-stat tracking-tight">{{ t('playgroups.empty.title') }}</div>
    <div class="text-body-sm text-fg-2 mx-auto leading-relaxed max-w-70 mt-1.5 mb-5.5">
      {{ t('playgroups.empty.sub') }}
    </div>
  </div>
</template>
