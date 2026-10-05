<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'win' | 'loss' | 'threat' | 'new' | 'arch'
}>(), { variant: 'win' })

const variantClasses: Record<string, string> = {
  win:    'bg-crown/16 text-crown',
  loss:   'bg-danger/12 text-danger',
  threat: 'bg-arcane/16 text-arcane-2',
  new:    'bg-tide/14 text-tide-2',
  arch:   'bg-crown text-bg-0',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-[9px] py-[3px] rounded-sm text-meta font-bold tracking-[0.04em] uppercase"
    :class="variantClasses[props.variant]"
  >
    <slot />
  </span>
</template>
