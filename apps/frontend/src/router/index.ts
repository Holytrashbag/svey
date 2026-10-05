import { createRouter, createWebHistory } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import AuthView from '@/views/AuthView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Root: after OAuth the browser lands here; the guard below will redirect.
    { path: '/',        component: AuthView,    meta: { guestOnly: true } },
    { path: '/auth',    component: AuthView,    meta: { guestOnly: true } },
    { path: '/home',    component: () => import('@/views/HomeView.vue'),    meta: { requiresAuth: true } },
    { path: '/decks',        component: () => import('@/views/DecksView.vue'),       meta: { requiresAuth: true } },
    { path: '/decks/add',   component: () => import('@/views/AddDeckView.vue'),     meta: { requiresAuth: true } },
    { path: '/decks/:id',   component: () => import('@/views/DeckDetailView.vue'),  meta: { requiresAuth: true } },
    { path: '/pods',     component: () => import('@/views/PodsView.vue'),           meta: { requiresAuth: true } },
    { path: '/pods/:id',         component: () => import('@/views/PlaygroupDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/pods/:id/members', component: () => import('@/views/ManageMembersView.vue'),   meta: { requiresAuth: true } },
    { path: '/pods/:id/game',         component: () => import('@/views/GameSetupView.vue'),    meta: { requiresAuth: true } },
    { path: '/pods/:id/game/tracker', component: () => import('@/views/GameTrackerView.vue'),  meta: { requiresAuth: true } },
    { path: '/pods/:id/game/survey',  component: () => import('@/views/GameSurveyView.vue'), meta: { requiresAuth: true } },
    { path: '/games/:id',            component: () => import('@/views/GameRecapView.vue'),  meta: { requiresAuth: true } },
    { path: '/profile',  component: () => import('@/views/ProfileView.vue'),         meta: { requiresAuth: true } },

    // Password reset landing (from the email link) — public, carries a ?token query.
    { path: '/reset-password', component: () => import('@/views/ResetPasswordView.vue') },

    // Legal pages — public (no auth/guest guard), reachable from the auth screen and profile menu.
    { path: '/impressum',   component: () => import('@/views/ImpressumView.vue') },
    { path: '/datenschutz', component: () => import('@/views/DatenschutzView.vue') },
    { path: '/terms',       component: () => import('@/views/TermsView.vue') },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.guestOnly) return

  try {
    const { data: session } = await authClient.getSession()
    if (to.meta.requiresAuth && !session) return '/auth'
    if (to.meta.guestOnly && session)    return '/home'
  } catch {
    if (to.meta.requiresAuth) return '/auth'
  }
})

export default router
