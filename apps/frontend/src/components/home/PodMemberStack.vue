<script setup lang="ts">
import { computed } from 'vue'
import SbAvatar from '@/components/ui/SbAvatar.vue'

export interface PodMember {
  name:      string
  online?:   boolean
  you?:      boolean
  avatarUrl?: string | null
}

const props = withDefaults(defineProps<{
  members: PodMember[]
  size?: number
  max?: number
  ringColor?: string
}>(), { size: 32, max: 4, ringColor: '#0E1120' })

const shown = computed(() => props.members.slice(0, props.max))
const extra = computed(() => Math.max(0, props.members.length - props.max))
const dotSize = computed(() => Math.max(8, props.size * 0.30))
</script>

<template>
  <div class="flex">
    <div
      v-for="(m, i) in shown"
      :key="i"
      class="relative rounded-full"
      :style="{
        marginLeft: i === 0 ? '0' : '-8px',
        boxShadow: `0 0 0 2px ${ringColor}`,
      }"
    >
      <SbAvatar :name="m.name" :size="size" :you="m.you" :image-url="m.avatarUrl ?? undefined" />
      <div
        v-if="m.online"
        class="absolute rounded-full bg-success"
        :style="{
          bottom: '-1px',
          right: '-1px',
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          boxShadow: `0 0 0 2px ${ringColor}`,
        }"
      />
    </div>
    <div
      v-if="extra > 0"
      class="rounded-full bg-bg-2 text-fg-2 flex items-center justify-center font-bold"
      :style="{
        marginLeft: '-8px',
        boxShadow: `0 0 0 2px ${ringColor}`,
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.34}px`,
      }"
    >+{{ extra }}</div>
  </div>
</template>
