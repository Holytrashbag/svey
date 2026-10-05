<script setup lang="ts">
import { computed, ref } from 'vue'
import { AVATAR_ROLE } from '@/lib/mtg'

const props = withDefaults(defineProps<{
  name: string
  size?: number
  color?: string
  imageUrl?: string
  you?: boolean
  tint?: 'crown'
}>(), { size: 32, you: false })

const PALETTE = ['#8B5CF6', '#14B8A6', '#F4B942', '#E8654E', '#4A8FE7', '#4BAE6E']

const bg = computed(() => {
  if (props.tint === 'crown') return AVATAR_ROLE.crown.bg
  if (props.you) return AVATAR_ROLE.you.bg
  if (props.color) return props.color
  const idx = (props.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length
  return PALETTE[idx]
})

const fg = computed(() => {
  if (props.tint === 'crown') return AVATAR_ROLE.crown.fg
  if (props.you) return AVATAR_ROLE.you.fg
  const isLight = bg.value === '#F4B942' || bg.value === '#F3E4B5'
  return isLight ? '#06070D' : '#fff'
})

const initial = computed(() => (props.name ?? '?').charAt(0).toUpperCase())

const imgError = ref(false)
const showImage = computed(() => !!props.imageUrl && !imgError.value)
</script>

<template>
  <img
    v-if="showImage"
    :src="imageUrl"
    :alt="name"
    class="rounded-full object-cover shrink-0"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="imgError = true"
  />
  <div
    v-else
    class="rounded-full flex items-center justify-center font-display font-bold shrink-0 border border-white/6"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: bg,
      fontSize: `${size * 0.42}px`,
      color: fg,
    }"
  >
    {{ initial }}
  </div>
</template>
