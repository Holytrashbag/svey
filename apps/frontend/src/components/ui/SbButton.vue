<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'crown' | 'danger' | 'fab'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
})

const variantClasses: Record<string, string> = {
  primary:   'bg-arcane text-white hover:bg-arcane-2 active:bg-arcane-d',
  secondary: 'bg-bg-2 text-fg-0 border border-white/12 hover:bg-bg-3',
  ghost:     'bg-transparent text-arcane-2 hover:bg-arcane/10',
  crown:     'bg-crown text-bg-0 hover:bg-crown-2 active:bg-crown-d',
  danger:    'bg-danger/14 text-danger hover:bg-danger/20',
  fab:       'bg-arcane text-white rounded-full w-14 h-14 text-2xl hover:bg-arcane-2 active:bg-arcane-d',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-[13px] rounded-[8px]',
  md: 'px-4 py-2.5 text-[14px] rounded-md',
  lg: 'px-[22px] py-3.5 text-[15px] rounded-md',
}

const classes = computed(() =>
  [
    'inline-flex items-center justify-center gap-1.5',
    'font-body font-semibold cursor-pointer border-0',
    'transition-all duration-[80ms] ease-in-out active:scale-[0.97]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    props.variant === 'fab' ? variantClasses.fab : `${sizeClasses[props.size]} ${variantClasses[props.variant]}`,
  ].join(' ')
)
</script>

<template>
  <button :class="classes" :disabled="disabled">
    <slot name="icon" />
    <slot />
  </button>
</template>
