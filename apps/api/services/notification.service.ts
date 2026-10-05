import { eq, and, desc, count, isNull } from 'drizzle-orm'
import type { Db } from '../lib/db.ts'
import { notification, playgroupMember, type NotificationParams } from '../db/schema.ts'

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'member_joined'
  | 'member_approved'
  | 'role_changed'
  | 'deck_archidekt_deleted'

export type NotificationItem = {
  id:          string
  type:        NotificationType
  title:       string
  body:        string | null
  params:      NotificationParams | null
  playgroupId: string | null
  deckId:      string | null
  read:        boolean
  createdAt:   string
}

export type NotificationPayload = {
  type:         NotificationType
  title:        string
  body?:        string | null
  params?:      NotificationParams
  playgroupId?: string | null
  deckId?:      string | null
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listNotifications(
  dbClient: Db,
  userId: string,
  limit = 30,
): Promise<NotificationItem[]> {
  const rows = await dbClient
    .select({
      id:          notification.id,
      type:        notification.type,
      title:       notification.title,
      body:        notification.body,
      params:      notification.params,
      playgroupId: notification.playgroupId,
      deckId:      notification.deckId,
      readAt:      notification.readAt,
      createdAt:   notification.createdAt,
    })
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit)

  return rows.map(r => ({
    id:          r.id,
    type:        r.type,
    title:       r.title,
    body:        r.body,
    params:      r.params,
    playgroupId: r.playgroupId,
    deckId:      r.deckId,
    read:        r.readAt !== null,
    createdAt:   r.createdAt.toISOString(),
  }))
}

export async function getUnreadCount(dbClient: Db, userId: string): Promise<number> {
  const rows = await dbClient
    .select({ value: count(notification.id) })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))

  return rows[0]?.value ?? 0
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export async function markRead(dbClient: Db, userId: string, id: string): Promise<void> {
  await dbClient
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(
      eq(notification.id, id),
      eq(notification.userId, userId),
      isNull(notification.readAt),
    ))
}

export async function markAllRead(dbClient: Db, userId: string): Promise<void> {
  await dbClient
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))
}

// ── Creation (emit) ──────────────────────────────────────────────────────────
// These are best-effort: callers wrap them in try/catch so a notification
// failure never breaks the primary action that triggered it.

export async function createNotification(
  dbClient: Db,
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  await dbClient.insert(notification).values({
    userId,
    type:        payload.type,
    title:       payload.title,
    body:        payload.body ?? null,
    params:      payload.params ?? null,
    playgroupId: payload.playgroupId ?? null,
    deckId:      payload.deckId ?? null,
  })
}

export async function createNotificationsForPlaygroupAdmins(
  dbClient: Db,
  playgroupId: string,
  payload: NotificationPayload,
  opts: { excludeUserId?: string } = {},
): Promise<void> {
  const admins = await dbClient
    .select({ userId: playgroupMember.userId })
    .from(playgroupMember)
    .where(and(
      eq(playgroupMember.playgroupId, playgroupId),
      eq(playgroupMember.role, 'admin'),
      eq(playgroupMember.isPending, false),
    ))

  const recipientIds = [
    ...new Set(
      admins
        .map(a => a.userId)
        .filter((id): id is string => id !== null && id !== opts.excludeUserId),
    ),
  ]

  if (recipientIds.length === 0) return

  await dbClient.insert(notification).values(
    recipientIds.map(userId => ({
      userId,
      type:        payload.type,
      title:       payload.title,
      body:        payload.body ?? null,
      params:      payload.params ?? null,
      playgroupId: payload.playgroupId ?? null,
      deckId:      payload.deckId ?? null,
    })),
  )
}
