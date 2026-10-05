import { randomBytes } from 'node:crypto'
import { pgTable, uuid, text as pgText } from 'drizzle-orm/pg-core'
import { eq, and, inArray, count, sql, desc } from 'drizzle-orm'
import type { Db } from '../lib/db.ts'
import { playgroup, playgroupMember, game, gamePlayer, deck } from '../db/schema.ts'
import { Errors } from '../lib/errors.ts'
import * as notificationService from './notification.service.ts'

// Read-only reference to Better Auth's user table (not managed by our migrations)
const authUser = pgTable('user', {
  id:        uuid('id').primaryKey(),
  avatarUrl: pgText('avatar_url'),
})

// ── Types ──────────────────────────────────────────────────────────────────────

export type PodMemberItem = {
  id:        string
  name:      string
  you?:      boolean
  avatarUrl: string | null
}

export type ActivePlaygroupItem = {
  id:          string
  name:        string
  members:     PodMemberItem[]
  lastPlayed:  string | null
  record:      { wins: number; losses: number }
  unreadGames?: number
}

export type PendingInviteItem = {
  id:          string
  playgroupId: string
  name:        string
  members:     PodMemberItem[]
  invitedBy:   string
  games:       number
}

export type PlaygroupListResult = {
  active:  ActivePlaygroupItem[]
  pending: PendingInviteItem[]
}

export type PlaygroupMemberDetail = {
  id:        string
  name:      string
  online:    boolean
  role:      'admin' | 'member'
  mainDeck:  string | null
  wins:      number
  threat:    number
  you:       boolean
  avatarUrl: string | null
  joinedAt:  string
  games:     number
  isOwner:   boolean
}

export type PendingMemberItem = {
  id:          string
  name:        string
  requestedAt: string
}

export type RecentGameItem = {
  id:       string
  winnerId: string
  deck:     string
  when:     string
  duration: string
}

export type PlaygroupDetail = {
  id:         string
  name:       string
  code:       string
  founded:    string
  totalGames: number
  thisMonth:  number
  avgLength:  number
  members:    PlaygroupMemberDetail[]
  recent:     RecentGameItem[]
}

// ── helpers ────────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  const block = Array.from({ length: 4 }, (_, i) => charset[bytes[i]! % charset.length]).join('')
  const suffix = String(bytes[4]! % 100).padStart(2, '0')
  return `SPELL-${block}-${suffix}`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  return `${Math.round(seconds / 60)} min`
}

async function getPlaygroupName(dbClient: Db, playgroupId: string): Promise<string> {
  const rows = await dbClient
    .select({ name: playgroup.name })
    .from(playgroup)
    .where(eq(playgroup.id, playgroupId))
    .limit(1)
  return rows[0]?.name ?? 'your playgroup'
}

// ── listPlaygroups ─────────────────────────────────────────────────────────────

export async function listPlaygroups(dbClient: Db, userId: string): Promise<PlaygroupListResult> {
  const myMembers = await dbClient
    .select({
      id:          playgroupMember.id,
      playgroupId: playgroupMember.playgroupId,
      isPending:   playgroupMember.isPending,
    })
    .from(playgroupMember)
    .where(eq(playgroupMember.userId, userId))

  if (myMembers.length === 0) return { active: [], pending: [] }

  const playgroupIds = [...new Set(myMembers.map(m => m.playgroupId))]

  const [groups, allMembers, gameCounts, lastGames] = await Promise.all([
    dbClient
      .select({ id: playgroup.id, name: playgroup.name })
      .from(playgroup)
      .where(inArray(playgroup.id, playgroupIds)),

    dbClient
      .select({
        id:          playgroupMember.id,
        playgroupId: playgroupMember.playgroupId,
        displayName: playgroupMember.displayName,
        role:        playgroupMember.role,
        isPending:   playgroupMember.isPending,
        userId:      playgroupMember.userId,
      })
      .from(playgroupMember)
      .where(and(
        inArray(playgroupMember.playgroupId, playgroupIds),
        eq(playgroupMember.isPending, false),
      )),

    dbClient
      .select({
        playgroupId: game.playgroupId,
        total:       count(game.id),
      })
      .from(game)
      .where(inArray(game.playgroupId, playgroupIds))
      .groupBy(game.playgroupId),

    dbClient
      .select({ playgroupId: game.playgroupId, startedAt: game.startedAt })
      .from(game)
      .where(inArray(game.playgroupId, playgroupIds))
      .orderBy(desc(game.startedAt)),
  ])

  const memberUserIds = [...new Set(allMembers.map(m => m.userId).filter(Boolean) as string[])]
  const avatarByUserId: Record<string, string | null> = {}
  if (memberUserIds.length > 0) {
    const avatarRows = await dbClient
      .select({ id: authUser.id, avatarUrl: authUser.avatarUrl })
      .from(authUser)
      .where(inArray(authUser.id, memberUserIds))
    for (const r of avatarRows) avatarByUserId[r.id] = r.avatarUrl
  }

  const activeMyMemberIds = myMembers.filter(m => !m.isPending).map(m => m.id)
  const pendingMyMemberIds = myMembers.filter(m => m.isPending).map(m => m.id)

  let winRows: { playgroupMemberId: string | null; wins: number }[] = []
  let lossRows: { playgroupMemberId: string | null; losses: number }[] = []

  if (activeMyMemberIds.length > 0) {
    const [wins, losses] = await Promise.all([
      dbClient
        .select({
          playgroupMemberId: gamePlayer.playgroupMemberId,
          wins: count(gamePlayer.id),
        })
        .from(gamePlayer)
        .where(and(
          inArray(gamePlayer.playgroupMemberId, activeMyMemberIds),
          eq(gamePlayer.isWinner, true),
        ))
        .groupBy(gamePlayer.playgroupMemberId),

      dbClient
        .select({
          playgroupMemberId: gamePlayer.playgroupMemberId,
          losses: count(gamePlayer.id),
        })
        .from(gamePlayer)
        .where(and(
          inArray(gamePlayer.playgroupMemberId, activeMyMemberIds),
          eq(gamePlayer.isWinner, false),
        ))
        .groupBy(gamePlayer.playgroupMemberId),
    ])
    winRows = wins
    lossRows = losses
  }

  const winsByMember: Record<string, number> = {}
  const lossesByMember: Record<string, number> = {}
  for (const r of winRows) if (r.playgroupMemberId) winsByMember[r.playgroupMemberId] = r.wins
  for (const r of lossRows) if (r.playgroupMemberId) lossesByMember[r.playgroupMemberId] = r.losses

  const lastPlayedByGroup: Record<string, string> = {}
  for (const g of lastGames) {
    if (!lastPlayedByGroup[g.playgroupId]) {
      lastPlayedByGroup[g.playgroupId] = g.startedAt.toISOString()
    }
  }

  const totalGamesByGroup: Record<string, number> = {}
  for (const r of gameCounts) totalGamesByGroup[r.playgroupId] = r.total

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g]))
  const membersByGroup: Record<string, typeof allMembers> = {}
  for (const m of allMembers) {
    if (!membersByGroup[m.playgroupId]) membersByGroup[m.playgroupId] = []
    membersByGroup[m.playgroupId]!.push(m)
  }

  const myMemberByGroup: Record<string, string> = {}
  for (const m of myMembers) myMemberByGroup[m.playgroupId] = m.id

  const active: ActivePlaygroupItem[] = []
  const pending: PendingInviteItem[] = []

  for (const m of myMembers) {
    const group = groupMap[m.playgroupId]
    if (!group) continue

    const groupMembers = membersByGroup[m.playgroupId] ?? []

    if (!m.isPending) {
      const myMemberId = m.id
      active.push({
        id:         group.id,
        name:       group.name,
        members:    groupMembers.map(gm => ({
          id:        gm.id,
          name:      gm.displayName,
          you:       gm.userId === userId || undefined,
          avatarUrl: gm.userId ? (avatarByUserId[gm.userId] ?? null) : null,
        })),
        lastPlayed: lastPlayedByGroup[group.id] ?? null,
        record: {
          wins:   winsByMember[myMemberId] ?? 0,
          losses: lossesByMember[myMemberId] ?? 0,
        },
      })
    } else {
      const adminMember = groupMembers.find(gm => gm.role === 'admin')
      pending.push({
        id:          m.id,
        playgroupId: group.id,
        name:        group.name,
        members:     groupMembers.map(gm => ({ id: gm.id, name: gm.displayName, avatarUrl: gm.userId ? (avatarByUserId[gm.userId] ?? null) : null })),
        invitedBy:   adminMember?.displayName ?? 'Someone',
        games:       totalGamesByGroup[group.id] ?? 0,
      })
    }
  }

  // Remove pending entries where the user is also an active member
  // (shouldn't happen but guard anyway)
  const activeGroupIds = new Set(active.map(a => a.id))
  return {
    active,
    pending: pending.filter(p => !activeGroupIds.has(p.playgroupId)),
  }
}

// ── createPlaygroup ────────────────────────────────────────────────────────────

export async function createPlaygroup(
  dbClient: Db,
  userId: string,
  displayName: string,
  data: { name: string },
): Promise<{ id: string; inviteCode: string }> {
  let code = generateInviteCode()
  // Retry once on the unlikely collision
  const existing = await dbClient
    .select({ id: playgroup.id })
    .from(playgroup)
    .where(eq(playgroup.inviteCode, code))
    .limit(1)
  if (existing.length > 0) code = generateInviteCode()

  let newId = ''
  await dbClient.transaction(async (tx) => {
    const [created] = await tx
      .insert(playgroup)
      .values({ name: data.name, inviteCode: code, createdBy: userId })
      .returning({ id: playgroup.id })

    if (!created) throw new Error('Failed to insert playgroup')
    newId = created.id

    await tx.insert(playgroupMember).values({
      playgroupId: newId,
      userId,
      displayName,
      role:       'admin',
      isPending:  false,
    })
  })

  return { id: newId, inviteCode: code }
}

// ── joinPlaygroup ──────────────────────────────────────────────────────────────

export async function joinPlaygroup(
  dbClient: Db,
  userId: string,
  displayName: string,
  code: string,
): Promise<{ playgroupId: string }> {
  const rows = await dbClient
    .select({ id: playgroup.id, name: playgroup.name })
    .from(playgroup)
    .where(eq(playgroup.inviteCode, code.trim().toUpperCase()))
    .limit(1)

  if (rows.length === 0) throw Errors.notFound('No playgroup found with that invite code.')

  const playgroupId = rows[0]!.id
  const playgroupName = rows[0]!.name

  const existing = await dbClient
    .select({ id: playgroupMember.id })
    .from(playgroupMember)
    .where(and(eq(playgroupMember.playgroupId, playgroupId), eq(playgroupMember.userId, userId)))
    .limit(1)

  if (existing.length > 0) throw Errors.conflict('You are already a member of this playgroup.')

  await dbClient.insert(playgroupMember).values({
    playgroupId,
    userId,
    displayName,
    role:      'member',
    isPending: false,
  })

  try {
    await notificationService.createNotificationsForPlaygroupAdmins(
      dbClient,
      playgroupId,
      {
        type:  'member_joined',
        title: `${displayName} joined ${playgroupName}`,
        params: { name: displayName, playgroup: playgroupName },
        playgroupId,
      },
      { excludeUserId: userId },
    )
  } catch (err) {
    console.error('Failed to emit member_joined notification', err)
  }

  return { playgroupId }
}

// ── getPlaygroupDetail ─────────────────────────────────────────────────────────

export async function getPlaygroupDetail(
  dbClient: Db,
  userId: string,
  playgroupId: string,
): Promise<PlaygroupDetail> {
  const groupRows = await dbClient
    .select()
    .from(playgroup)
    .where(eq(playgroup.id, playgroupId))
    .limit(1)

  const group = groupRows[0]
  if (!group) throw Errors.notFound('Playgroup not found.')

  const members = await dbClient
    .select()
    .from(playgroupMember)
    .where(and(
      eq(playgroupMember.playgroupId, playgroupId),
      eq(playgroupMember.isPending, false),
    ))

  const myMember = members.find(m => m.userId === userId)
  if (!myMember) throw Errors.forbidden('You are not a member of this playgroup.')

  const memberIds = members.map(m => m.id)
  const detailUserIds = [...new Set(members.map(m => m.userId).filter(Boolean) as string[])]
  const detailAvatarByUserId: Record<string, string | null> = {}
  if (detailUserIds.length > 0) {
    const rows = await dbClient
      .select({ id: authUser.id, avatarUrl: authUser.avatarUrl })
      .from(authUser)
      .where(inArray(authUser.id, detailUserIds))
    for (const r of rows) detailAvatarByUserId[r.id] = r.avatarUrl
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [games, winCounts, deckUsage] = await Promise.all([
    dbClient
      .select({
        id:              game.id,
        durationSeconds: game.durationSeconds,
        startedAt:       game.startedAt,
      })
      .from(game)
      .where(eq(game.playgroupId, playgroupId))
      .orderBy(desc(game.startedAt))
      .limit(50),

    memberIds.length > 0
      ? dbClient
          .select({
            playgroupMemberId: gamePlayer.playgroupMemberId,
            wins: count(gamePlayer.id),
          })
          .from(gamePlayer)
          .where(and(
            inArray(gamePlayer.playgroupMemberId, memberIds),
            eq(gamePlayer.isWinner, true),
          ))
          .groupBy(gamePlayer.playgroupMemberId)
      : Promise.resolve([]),

    memberIds.length > 0
      ? dbClient
          .select({
            playgroupMemberId: gamePlayer.playgroupMemberId,
            deckId:            gamePlayer.deckId,
            plays:             count(gamePlayer.id),
          })
          .from(gamePlayer)
          .innerJoin(game, eq(game.id, gamePlayer.gameId))
          .where(and(
            inArray(gamePlayer.playgroupMemberId, memberIds),
            eq(game.playgroupId, playgroupId),
          ))
          .groupBy(gamePlayer.playgroupMemberId, gamePlayer.deckId)
      : Promise.resolve([]),
  ])

  const totalGames = games.length
  const thisMonth = games.filter(g => g.startedAt >= monthStart).length
  const durationsWithValue = games.filter(g => g.durationSeconds && g.durationSeconds > 0)
  const avgLength = durationsWithValue.length > 0
    ? Math.round(durationsWithValue.reduce((s, g) => s + (g.durationSeconds ?? 0), 0) / durationsWithValue.length / 60)
    : 0

  const winsByMember: Record<string, number> = {}
  for (const r of winCounts) {
    if (r.playgroupMemberId) winsByMember[r.playgroupMemberId] = r.wins
  }

  // Find main deck per member (most-played deckId in this playgroup)
  const topDeckByMember: Record<string, string> = {}
  const deckByMember: Record<string, Record<string, number>> = {}
  const gamesByMember: Record<string, number> = {}
  for (const r of deckUsage) {
    if (!r.playgroupMemberId) continue
    if (!deckByMember[r.playgroupMemberId]) deckByMember[r.playgroupMemberId] = {}
    deckByMember[r.playgroupMemberId]![r.deckId] = r.plays
    gamesByMember[r.playgroupMemberId] = (gamesByMember[r.playgroupMemberId] ?? 0) + r.plays
  }
  for (const [memberId, deckPlays] of Object.entries(deckByMember)) {
    const top = Object.entries(deckPlays).sort((a, b) => b[1] - a[1])[0]
    if (top) topDeckByMember[memberId] = top[0]
  }

  const deckIds = [...new Set(Object.values(topDeckByMember))]
  const deckNames: Record<string, string> = {}
  if (deckIds.length > 0) {
    const deckRows = await dbClient
      .select({ id: deck.id, name: deck.name })
      .from(deck)
      .where(inArray(deck.id, deckIds))
    for (const d of deckRows) deckNames[d.id] = d.name
  }

  const memberDetails: PlaygroupMemberDetail[] = members.map(m => {
    const wins = winsByMember[m.id] ?? 0
    const threat = totalGames > 0 ? Math.round((wins / totalGames) * 100) / 10 : 0
    const topDeckId = topDeckByMember[m.id]
    return {
      id:        m.id,
      name:      m.displayName,
      online:    false,
      role:      m.role,
      mainDeck:  topDeckId ? (deckNames[topDeckId] ?? null) : null,
      wins,
      threat,
      you:       m.userId === userId,
      avatarUrl: m.userId ? (detailAvatarByUserId[m.userId] ?? null) : null,
      joinedAt:  m.joinedAt.toISOString(),
      games:     gamesByMember[m.id] ?? 0,
      isOwner:   m.userId === group.createdBy,
    }
  })

  // Recent games: fetch game players for the most recent 8 games
  const recentGames = games.slice(0, 8)
  const recentItems: RecentGameItem[] = []

  if (recentGames.length > 0) {
    const recentGameIds = recentGames.map(g => g.id)
    const recentPlayers = await dbClient
      .select({
        gameId:            gamePlayer.gameId,
        playgroupMemberId: gamePlayer.playgroupMemberId,
        deckId:            gamePlayer.deckId,
        isWinner:          gamePlayer.isWinner,
      })
      .from(gamePlayer)
      .where(inArray(gamePlayer.gameId, recentGameIds))

    const winnerByGame: Record<string, { memberId: string | null; deckId: string }> = {}
    for (const p of recentPlayers) {
      if (p.isWinner) {
        winnerByGame[p.gameId] = { memberId: p.playgroupMemberId, deckId: p.deckId }
      }
    }

    const winnerDeckIds = [...new Set(Object.values(winnerByGame).map(w => w.deckId))]
    const winnerDeckNames: Record<string, string> = {}
    if (winnerDeckIds.length > 0) {
      const rows = await dbClient
        .select({ id: deck.id, name: deck.name })
        .from(deck)
        .where(inArray(deck.id, winnerDeckIds))
      for (const d of rows) winnerDeckNames[d.id] = d.name
    }

    for (const g of recentGames) {
      const winner = winnerByGame[g.id]
      if (!winner) continue
      recentItems.push({
        id:       g.id,
        winnerId: winner.memberId ?? '',
        deck:     winnerDeckNames[winner.deckId] ?? 'Unknown deck',
        when:     g.startedAt.toISOString(),
        duration: formatDuration(g.durationSeconds),
      })
    }
  }

  return {
    id:         group.id,
    name:       group.name,
    code:       group.inviteCode,
    founded:    group.createdAt.toISOString(),
    totalGames,
    thisMonth,
    avgLength,
    members:    memberDetails,
    recent:     recentItems,
  }
}

// ── acceptInvite ───────────────────────────────────────────────────────────────

export async function acceptInvite(
  dbClient: Db,
  userId: string,
  memberId: string,
): Promise<void> {
  const rows = await dbClient
    .select({ userId: playgroupMember.userId, isPending: playgroupMember.isPending })
    .from(playgroupMember)
    .where(eq(playgroupMember.id, memberId))
    .limit(1)

  const row = rows[0]
  if (!row) throw Errors.notFound('Invite not found.')
  if (row.userId !== userId) throw Errors.forbidden('This invite is not for you.')
  if (!row.isPending) throw Errors.badRequest('This invite has already been accepted.')

  await dbClient
    .update(playgroupMember)
    .set({ isPending: false })
    .where(eq(playgroupMember.id, memberId))
}

// ── removeMember ───────────────────────────────────────────────────────────────
// Handles both member removal (admin) and invite decline (self-removal of a pending record).

export async function removeMember(
  dbClient: Db,
  userId: string,
  playgroupId: string,
  memberId: string,
): Promise<void> {
  const [callerRows, targetRows] = await Promise.all([
    dbClient
      .select({ role: playgroupMember.role })
      .from(playgroupMember)
      .where(and(eq(playgroupMember.playgroupId, playgroupId), eq(playgroupMember.userId, userId)))
      .limit(1),

    dbClient
      .select({ id: playgroupMember.id, userId: playgroupMember.userId })
      .from(playgroupMember)
      .where(and(eq(playgroupMember.id, memberId), eq(playgroupMember.playgroupId, playgroupId)))
      .limit(1),
  ])

  if (!callerRows[0]) throw Errors.forbidden('You are not a member of this playgroup.')
  if (!targetRows[0]) throw Errors.notFound('Member not found.')

  const isSelf = targetRows[0].userId === userId
  const isAdmin = callerRows[0].role === 'admin'

  if (!isSelf && !isAdmin) throw Errors.forbidden('Only admins can remove other members.')

  await dbClient
    .delete(playgroupMember)
    .where(eq(playgroupMember.id, memberId))
}

// ── listPendingMembers ─────────────────────────────────────────────────────────

export async function listPendingMembers(
  dbClient: Db,
  userId: string,
  playgroupId: string,
): Promise<PendingMemberItem[]> {
  const callerRows = await dbClient
    .select({ role: playgroupMember.role })
    .from(playgroupMember)
    .where(and(
      eq(playgroupMember.playgroupId, playgroupId),
      eq(playgroupMember.userId, userId),
      eq(playgroupMember.isPending, false),
    ))
    .limit(1)

  if (!callerRows[0]) throw Errors.forbidden('You are not a member of this playgroup.')
  if (callerRows[0].role !== 'admin') throw Errors.forbidden('Only admins can view pending members.')

  const rows = await dbClient
    .select({
      id:          playgroupMember.id,
      displayName: playgroupMember.displayName,
      joinedAt:    playgroupMember.joinedAt,
    })
    .from(playgroupMember)
    .where(and(
      eq(playgroupMember.playgroupId, playgroupId),
      eq(playgroupMember.isPending, true),
    ))

  return rows.map(r => ({
    id:          r.id,
    name:        r.displayName,
    requestedAt: r.joinedAt.toISOString(),
  }))
}

// ── approveMember ──────────────────────────────────────────────────────────────

export async function approveMember(
  dbClient: Db,
  userId: string,
  playgroupId: string,
  memberId: string,
): Promise<void> {
  const [callerRows, targetRows] = await Promise.all([
    dbClient
      .select({ role: playgroupMember.role })
      .from(playgroupMember)
      .where(and(
        eq(playgroupMember.playgroupId, playgroupId),
        eq(playgroupMember.userId, userId),
        eq(playgroupMember.isPending, false),
      ))
      .limit(1),
    dbClient
      .select({ isPending: playgroupMember.isPending, userId: playgroupMember.userId })
      .from(playgroupMember)
      .where(and(
        eq(playgroupMember.id, memberId),
        eq(playgroupMember.playgroupId, playgroupId),
      ))
      .limit(1),
  ])

  if (!callerRows[0]) throw Errors.forbidden('You are not a member of this playgroup.')
  if (callerRows[0].role !== 'admin') throw Errors.forbidden('Only admins can approve pending members.')
  if (!targetRows[0]) throw Errors.notFound('Pending member not found.')
  if (!targetRows[0].isPending) throw Errors.badRequest('This member is not pending.')

  await dbClient
    .update(playgroupMember)
    .set({ isPending: false })
    .where(eq(playgroupMember.id, memberId))

  const approvedUserId = targetRows[0].userId
  if (approvedUserId) {
    try {
      const playgroupName = await getPlaygroupName(dbClient, playgroupId)
      await notificationService.createNotification(dbClient, approvedUserId, {
        type:  'member_approved',
        title: `You're in — welcome to ${playgroupName}`,
        params: { playgroup: playgroupName },
        playgroupId,
      })
    } catch (err) {
      console.error('Failed to emit member_approved notification', err)
    }
  }
}

// ── updateMemberRole ───────────────────────────────────────────────────────────

export async function updateMemberRole(
  dbClient: Db,
  userId: string,
  playgroupId: string,
  memberId: string,
  role: 'admin' | 'member',
): Promise<void> {
  const [callerRows, targetRows, groupRows] = await Promise.all([
    dbClient
      .select({ role: playgroupMember.role })
      .from(playgroupMember)
      .where(and(
        eq(playgroupMember.playgroupId, playgroupId),
        eq(playgroupMember.userId, userId),
        eq(playgroupMember.isPending, false),
      ))
      .limit(1),
    dbClient
      .select({ userId: playgroupMember.userId })
      .from(playgroupMember)
      .where(and(
        eq(playgroupMember.id, memberId),
        eq(playgroupMember.playgroupId, playgroupId),
        eq(playgroupMember.isPending, false),
      ))
      .limit(1),
    dbClient
      .select({ createdBy: playgroup.createdBy })
      .from(playgroup)
      .where(eq(playgroup.id, playgroupId))
      .limit(1),
  ])

  if (!callerRows[0]) throw Errors.forbidden('You are not a member of this playgroup.')
  if (callerRows[0].role !== 'admin') throw Errors.forbidden('Only admins can change member roles.')
  if (!targetRows[0]) throw Errors.notFound('Member not found.')
  if (groupRows[0]?.createdBy === targetRows[0].userId) {
    throw Errors.forbidden('Cannot change the role of the playgroup owner.')
  }

  await dbClient
    .update(playgroupMember)
    .set({ role })
    .where(eq(playgroupMember.id, memberId))

  const targetUserId = targetRows[0].userId
  if (targetUserId) {
    try {
      const playgroupName = await getPlaygroupName(dbClient, playgroupId)
      await notificationService.createNotification(dbClient, targetUserId, {
        type:  'role_changed',
        title: role === 'admin'
          ? `You're now an admin of ${playgroupName}`
          : `Your role in ${playgroupName} changed to member`,
        params: { playgroup: playgroupName, role },
        playgroupId,
      })
    } catch (err) {
      console.error('Failed to emit role_changed notification', err)
    }
  }
}

// ── regenerateInviteCode ───────────────────────────────────────────────────────

export async function regenerateInviteCode(
  dbClient: Db,
  userId: string,
  playgroupId: string,
): Promise<{ code: string }> {
  const callerRows = await dbClient
    .select({ role: playgroupMember.role })
    .from(playgroupMember)
    .where(and(
      eq(playgroupMember.playgroupId, playgroupId),
      eq(playgroupMember.userId, userId),
      eq(playgroupMember.isPending, false),
    ))
    .limit(1)

  if (!callerRows[0]) throw Errors.forbidden('You are not a member of this playgroup.')
  if (callerRows[0].role !== 'admin') throw Errors.forbidden('Only admins can regenerate the invite code.')

  const code = generateInviteCode()
  await dbClient
    .update(playgroup)
    .set({ inviteCode: code })
    .where(eq(playgroup.id, playgroupId))

  return { code }
}

// ── transferOwnership ─────────────────────────────────────────────────────────

export async function transferOwnership(
  dbClient: Db,
  userId: string,
  playgroupId: string,
  newOwnerMemberId: string,
): Promise<void> {
  const [groupRows, targetRows] = await Promise.all([
    dbClient
      .select({ createdBy: playgroup.createdBy })
      .from(playgroup)
      .where(eq(playgroup.id, playgroupId))
      .limit(1),
    dbClient
      .select({ userId: playgroupMember.userId, isPending: playgroupMember.isPending })
      .from(playgroupMember)
      .where(and(
        eq(playgroupMember.id, newOwnerMemberId),
        eq(playgroupMember.playgroupId, playgroupId),
      ))
      .limit(1),
  ])

  if (!groupRows[0]) throw Errors.notFound('Playgroup not found.')
  if (groupRows[0].createdBy !== userId) throw Errors.forbidden('Only the playgroup owner can transfer ownership.')
  if (!targetRows[0]) throw Errors.notFound('Target member not found.')
  if (targetRows[0].isPending) throw Errors.badRequest('Cannot transfer ownership to a pending member.')
  if (!targetRows[0].userId) throw Errors.badRequest('Cannot transfer ownership to a member without an account.')

  await dbClient.transaction(async (tx) => {
    await tx
      .update(playgroupMember)
      .set({ role: 'admin' })
      .where(eq(playgroupMember.id, newOwnerMemberId))

    await tx
      .update(playgroup)
      .set({ createdBy: targetRows[0]!.userId! })
      .where(eq(playgroup.id, playgroupId))
  })
}
