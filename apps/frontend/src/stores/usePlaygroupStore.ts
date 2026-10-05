import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { ActivePlaygroupItem, PendingInviteItem, PlaygroupDetail, PendingMemberItem } from '@/types/api'

export type { PodMemberItem, ActivePlaygroupItem, PendingInviteItem, PlaygroupMemberDetail, RecentGameItem, PlaygroupDetail, PendingMemberItem } from '@/types/api'

// ── Store ──────────────────────────────────────────────────────────────────────

export const usePlaygroupStore = defineStore('playgroups', () => {
  const active  = ref<ActivePlaygroupItem[]>([])
  const pending = ref<PendingInviteItem[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)

  const currentPlaygroup  = ref<PlaygroupDetail | null>(null)
  const detailLoading     = ref(false)
  const detailError       = ref<string | null>(null)

  const pendingMembers        = ref<PendingMemberItem[]>([])
  const pendingMembersLoading = ref(false)

  const createLoading     = ref(false)
  const createError       = ref<string | null>(null)

  const joinLoading       = ref(false)
  const joinError         = ref<string | null>(null)

  async function fetchMyPlaygroups() {
    loading.value = true
    error.value   = null
    try {
      const res = await api.get<{ active: ActivePlaygroupItem[]; pending: PendingInviteItem[] }>('/playgroups')
      active.value  = res.active
      pending.value = res.pending
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load playgroups'
    } finally {
      loading.value = false
    }
  }

  async function createPlaygroup(name: string): Promise<{ id: string; inviteCode: string }> {
    createLoading.value = true
    createError.value   = null
    try {
      const res = await api.post<{ id: string; inviteCode: string }>('/playgroups', { name })
      await fetchMyPlaygroups()
      return res
    } catch (e) {
      createError.value = e instanceof Error ? e.message : 'Failed to create playgroup'
      throw e
    } finally {
      createLoading.value = false
    }
  }

  async function joinPlaygroup(code: string): Promise<{ playgroupId: string }> {
    joinLoading.value = true
    joinError.value   = null
    try {
      const res = await api.post<{ playgroupId: string }>('/playgroups/join', { code })
      await fetchMyPlaygroups()
      return res
    } catch (e) {
      joinError.value = e instanceof Error ? e.message : 'Failed to join playgroup'
      throw e
    } finally {
      joinLoading.value = false
    }
  }

  async function fetchPlaygroupDetail(id: string) {
    detailLoading.value = true
    detailError.value   = null
    try {
      currentPlaygroup.value = await api.get<PlaygroupDetail>(`/playgroups/${id}`)
    } catch (e) {
      detailError.value = e instanceof Error ? e.message : 'Failed to load playgroup'
    } finally {
      detailLoading.value = false
    }
  }

  async function acceptInvite(playgroupId: string, memberId: string) {
    try {
      await api.patch<void>(`/playgroups/${playgroupId}/members/${memberId}`, { accept: true })
      pending.value = pending.value.filter(p => p.id !== memberId)
      await fetchMyPlaygroups()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to accept invite'
    }
  }

  async function declineInvite(playgroupId: string, memberId: string) {
    try {
      await api.delete<void>(`/playgroups/${playgroupId}/members/${memberId}`)
      pending.value = pending.value.filter(p => p.id !== memberId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to decline invite'
    }
  }

  async function removeMember(playgroupId: string, memberId: string) {
    try {
      await api.delete<void>(`/playgroups/${playgroupId}/members/${memberId}`)
      if (currentPlaygroup.value?.id === playgroupId) {
        currentPlaygroup.value = {
          ...currentPlaygroup.value,
          members: currentPlaygroup.value.members.filter(m => m.id !== memberId),
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove member'
      throw e
    }
  }

  async function fetchPendingMembers(playgroupId: string) {
    pendingMembersLoading.value = true
    try {
      pendingMembers.value = await api.get<PendingMemberItem[]>(`/playgroups/${playgroupId}/pending`)
    } catch {
      pendingMembers.value = []
    } finally {
      pendingMembersLoading.value = false
    }
  }

  async function approvePendingMember(playgroupId: string, memberId: string) {
    await api.patch<void>(`/playgroups/${playgroupId}/members/${memberId}`, { approve: true })
    pendingMembers.value = pendingMembers.value.filter(m => m.id !== memberId)
  }

  async function rejectPendingMember(playgroupId: string, memberId: string) {
    await api.delete<void>(`/playgroups/${playgroupId}/members/${memberId}`)
    pendingMembers.value = pendingMembers.value.filter(m => m.id !== memberId)
  }

  async function updateMemberRole(playgroupId: string, memberId: string, role: 'admin' | 'member') {
    await api.patch<void>(`/playgroups/${playgroupId}/members/${memberId}`, { role })
    if (currentPlaygroup.value?.id === playgroupId) {
      currentPlaygroup.value = {
        ...currentPlaygroup.value,
        members: currentPlaygroup.value.members.map(m =>
          m.id === memberId ? { ...m, role } : m,
        ),
      }
    }
  }

  async function regenerateInviteCode(playgroupId: string): Promise<string> {
    const { code } = await api.post<{ code: string }>(`/playgroups/${playgroupId}/regenerate-invite`, {})
    if (currentPlaygroup.value?.id === playgroupId) {
      currentPlaygroup.value = { ...currentPlaygroup.value, code }
    }
    return code
  }

  async function transferOwnership(playgroupId: string, memberId: string) {
    await api.post<void>(`/playgroups/${playgroupId}/transfer-owner`, { memberId })
    await fetchPlaygroupDetail(playgroupId)
  }

  return {
    active, pending, loading, error,
    currentPlaygroup, detailLoading, detailError,
    pendingMembers, pendingMembersLoading,
    createLoading, createError,
    joinLoading, joinError,
    fetchMyPlaygroups,
    createPlaygroup,
    joinPlaygroup,
    fetchPlaygroupDetail,
    acceptInvite,
    declineInvite,
    removeMember,
    fetchPendingMembers,
    approvePendingMember,
    rejectPendingMember,
    updateMemberRole,
    regenerateInviteCode,
    transferOwnership,
  }
})
