import { type Ref, onMounted, onUnmounted } from 'vue'

export function useClickOutside(target: Ref<HTMLElement | null>, cb: () => void) {
  function handler(e: MouseEvent) {
    if (target.value && !target.value.contains(e.target as Node)) cb()
  }
  onMounted(() => document.addEventListener('click', handler))
  onUnmounted(() => document.removeEventListener('click', handler))
}
