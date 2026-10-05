<script setup lang="ts">
export type IconName =
  | 'home' | 'decks' | 'pods' | 'profile' | 'search' | 'bell'
  | 'chevron' | 'plus' | 'trophy' | 'flame' | 'swords' | 'chart'
  | 'crown' | 'arrow' | 'back' | 'more' | 'edit' | 'timer'
  | 'sparkle' | 'settings' | 'check' | 'x' | 'camera'

const props = withDefaults(defineProps<{
  name: IconName
  size?: number
  color?: string
  stroke?: number
}>(), {
  size: 20,
  color: 'currentColor',
  stroke: 1.8,
})

const paths: Record<string, string> = {
  home:     '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  decks:    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  pods:     '<circle cx="9" cy="9" r="4"/><path d="M2 21c0-3 3-5 7-5s7 2 7 5"/><circle cx="17" cy="10" r="3"/><path d="M14 21c0-2 2-3 5-3s4 1 4 3"/>',
  profile:  '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell:     '<path d="M6 19V11a6 6 0 1 1 12 0v8"/><path d="M4 19h16"/><path d="M10 22h4"/>',
  chevron:  '<path d="m9 6 6 6-6 6"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  trophy:   '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M5 4h3v4a3 3 0 0 1-3-3z"/><path d="M19 4h-3v4a3 3 0 0 0 3-3z"/><path d="M10 17h4l1 4H9z"/>',
  flame:    '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-2 2-3 4-4 4-1-2-2-4-2-6-3 2-5 5-5 9 0 4 3 7 7 7z"/>',
  swords:   '<path d="m14.5 17.5 4-4M21 3l-7 7M3 21l7-7"/><path d="m6.5 6.5 4-4M17.5 17.5l3 3"/>',
  chart:    '<path d="M3 3v18h18"/><path d="m7 14 3-3 4 4 6-6"/>',
  crown:    '<path d="m3 17 2-8 4 4 3-6 3 6 4-4 2 8z"/><path d="M3 21h18"/>',
  arrow:    '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back:     '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  more:     '<circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/>',
  edit:     '<path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  timer:    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>',
  sparkle:  '<path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  check:    '<path d="M5 12l5 5 9-12"/>',
  x:        '<path d="m6 6 12 12M18 6 6 18"/>',
  camera:   '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
}
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="props.color"
    :stroke-width="props.stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="shrink-0"
    v-html="paths[props.name]"
  />
</template>