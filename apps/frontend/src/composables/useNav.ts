import { useRouter } from 'vue-router'

const NAV_ROUTES: Record<string, string> = {
  home: '/home',
  decks: '/decks',
  pods: '/pods',
  you: '/profile',
}

export function useNav() {
  const router = useRouter()
  function onNav(id: string) {
    if (NAV_ROUTES[id]) void router.push(NAV_ROUTES[id])
  }
  return { onNav }
}
