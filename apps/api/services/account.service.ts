import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { eq, inArray } from 'drizzle-orm'
import type { Db } from '../lib/db.ts'
import { env } from '../lib/env.ts'
import { DELETED_USER_ID, DELETED_PLAYER_NAME } from '../lib/constants.ts'
import { playgroup, playgroupMember, game, gamePlayer, gameDecklistCard, surveyResponse, deck } from '../db/schema.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Resolve the avatar directory the same way the uploads plugin does, so deletion
// targets the same persistent volume in production (UPLOADS_DIR) without coupling
// this service to the Fastify plugin.
const AVATARS_DIR = path.join(
  env.UPLOADS_DIR ? path.resolve(env.UPLOADS_DIR) : path.join(__dirname, '..', 'uploads'),
  'avatars',
)

/**
 * Erases a user's personal data while preserving the shared playgroup/game
 * history of other members (GDPR Art. 17, with Art. 17(3) retention for third
 * parties' legitimate interests):
 *   - the user's own survey responses are deleted (personal authored content)
 *   - their seats in past games are anonymised to "Deleted player"
 *   - their playgroup memberships are removed
 *   - games they hosted and playgroups they created are reassigned to the
 *     sentinel user (those columns are NOT NULL FKs to "user")
 *   - decks referenced by any game are reassigned to the sentinel user (kept so
 *     the game snapshots stay valid); unused decks are deleted
 *   - their avatar files are removed from disk
 *
 * After this runs, the user owns/hosts/created nothing, so Better Auth can remove
 * the user / sessions / oauth accounts (see `deleteUser.beforeDelete` in
 * lib/auth.ts) without tripping the foreign keys.
 */
export async function deleteAccountData(db: Db, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // The user's playgroup memberships and the game seats tied to them.
    const memberRows = await tx
      .select({ id: playgroupMember.id })
      .from(playgroupMember)
      .where(eq(playgroupMember.userId, userId))
    const memberIds = memberRows.map((r) => r.id)

    let gamePlayerIds: string[] = []
    if (memberIds.length > 0) {
      const gpRows = await tx
        .select({ id: gamePlayer.id })
        .from(gamePlayer)
        .where(inArray(gamePlayer.playgroupMemberId, memberIds))
      gamePlayerIds = gpRows.map((r) => r.id)
    }

    if (gamePlayerIds.length > 0) {
      // Delete the user's own survey responses (personal authored content)...
      await tx.delete(surveyResponse).where(inArray(surveyResponse.gamePlayerId, gamePlayerIds))
      // ...and anonymise their seat so recaps show "Deleted player" instead of a name.
      await tx.update(gamePlayer).set({ guestName: DELETED_PLAYER_NAME }).where(inArray(gamePlayer.id, gamePlayerIds))
    }

    // Remove memberships. gamePlayer.playgroupMemberId is set to null via the FK.
    if (memberIds.length > 0) {
      await tx.delete(playgroupMember).where(eq(playgroupMember.userId, userId))
    }

    // Retained shared records whose owner/host/creator columns are NOT NULL FKs
    // to "user" are reassigned to the sentinel user so the real user row can go.
    await tx.update(game).set({ hostUserId: DELETED_USER_ID }).where(eq(game.hostUserId, userId))
    await tx.update(playgroup).set({ createdBy: DELETED_USER_ID }).where(eq(playgroup.createdBy, userId))

    // Decks: reassign those referenced by any game to the sentinel user (kept so
    // snapshots stay valid); hard-delete decks that were never played (cascades
    // their decklist_card rows). deck.owner_user_id is ON DELETE CASCADE, so any
    // deck still owned by the user when Better Auth removes the row would be
    // deleted too — hence used decks must be reassigned away first.
    const deckRows = await tx.select({ id: deck.id }).from(deck).where(eq(deck.ownerUserId, userId))
    const deckIds = deckRows.map((r) => r.id)

    if (deckIds.length > 0) {
      const usedInGames = await tx
        .select({ id: gamePlayer.deckId })
        .from(gamePlayer)
        .where(inArray(gamePlayer.deckId, deckIds))
      const usedInSnapshots = await tx
        .select({ id: gameDecklistCard.deckId })
        .from(gameDecklistCard)
        .where(inArray(gameDecklistCard.deckId, deckIds))
      const usedIds = new Set<string>([
        ...usedInGames.map((r) => r.id),
        ...usedInSnapshots.map((r) => r.id),
      ])

      const reassignIds = deckIds.filter((id) => usedIds.has(id))
      const deleteIds = deckIds.filter((id) => !usedIds.has(id))

      if (reassignIds.length > 0) {
        await tx.update(deck).set({ ownerUserId: DELETED_USER_ID }).where(inArray(deck.id, reassignIds))
      }
      if (deleteIds.length > 0) {
        await tx.delete(deck).where(inArray(deck.id, deleteIds))
      }
    }
  })

  // Best-effort avatar cleanup (filesystem, outside the transaction).
  deleteAvatarFiles(userId)
}

function deleteAvatarFiles(userId: string): void {
  try {
    for (const file of fs.readdirSync(AVATARS_DIR)) {
      if (file.startsWith(`${userId}.`)) {
        fs.unlinkSync(path.join(AVATARS_DIR, file))
      }
    }
  } catch {
    // Directory missing or unreadable — nothing to clean up.
  }
}
