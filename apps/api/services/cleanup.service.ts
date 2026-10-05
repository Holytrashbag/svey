import { and, eq, inArray, isNotNull, notExists } from 'drizzle-orm'
import type { Db } from '../lib/db.ts'
import { DELETED_USER_ID } from '../lib/constants.ts'
import { playgroup, playgroupMember, game, gamePlayer, gameDecklistCard, deck } from '../db/schema.ts'

export type CleanupResult = { playgroups: number; games: number; decks: number }

/**
 * Removes data that no real user can reach anymore. Idempotent — running it
 * repeatedly is safe and a no-op once everything is clean.
 *
 *  1. Empty playgroups (no member with a real userId — only pending invites or
 *     none) and all of their games are deleted. Game deletion cascades to
 *     gamePlayer, gameDecklistCard, commanderDamage and surveyResponse; the
 *     playgroup deletion cascades to its remaining (pending) members. The
 *     deck_stat_view / player_stat_view are plain views, so their stats vanish
 *     automatically once the underlying games are gone.
 *  2. Orphaned decks — those left ownerless by account deletion (DELETED_USER_ID)
 *     and no longer referenced by any game — are garbage-collected. Decks owned
 *     by real users are never touched, even if currently unused.
 *
 * Decks must be collected after step 1 so decks that only appeared in the
 * now-deleted games are recognised as unreferenced.
 */
export async function cleanupOrphanedData(db: Db): Promise<CleanupResult> {
  return db.transaction(async (tx) => {
    // 1. Empty playgroups: no membership row points to a real account.
    const emptyRows = await tx
      .select({ id: playgroup.id })
      .from(playgroup)
      .where(
        notExists(
          tx
            .select({ one: playgroupMember.id })
            .from(playgroupMember)
            .where(and(eq(playgroupMember.playgroupId, playgroup.id), isNotNull(playgroupMember.userId))),
        ),
      )
    const emptyIds = emptyRows.map((r) => r.id)

    let deletedGames = 0
    if (emptyIds.length > 0) {
      const gameRows = await tx.select({ id: game.id }).from(game).where(inArray(game.playgroupId, emptyIds))
      deletedGames = gameRows.length

      // Games first (game.playgroupId has no cascade), then the playgroups.
      if (deletedGames > 0) {
        await tx.delete(game).where(inArray(game.playgroupId, emptyIds))
      }
      await tx.delete(playgroup).where(inArray(playgroup.id, emptyIds))
    }

    // 2. Garbage-collect orphaned decks no game references anymore.
    let deletedDecks = 0
    const orphanRows = await tx.select({ id: deck.id }).from(deck).where(eq(deck.ownerUserId, DELETED_USER_ID))
    const orphanIds = orphanRows.map((r) => r.id)

    if (orphanIds.length > 0) {
      const usedInGames = await tx
        .select({ id: gamePlayer.deckId })
        .from(gamePlayer)
        .where(inArray(gamePlayer.deckId, orphanIds))
      const usedInSnapshots = await tx
        .select({ id: gameDecklistCard.deckId })
        .from(gameDecklistCard)
        .where(inArray(gameDecklistCard.deckId, orphanIds))
      const used = new Set<string>([
        ...usedInGames.map((r) => r.id),
        ...usedInSnapshots.map((r) => r.id),
      ])

      const deleteIds = orphanIds.filter((id) => !used.has(id))
      if (deleteIds.length > 0) {
        await tx.delete(deck).where(inArray(deck.id, deleteIds)) // cascades decklist_card
        deletedDecks = deleteIds.length
      }
    }

    return { playgroups: emptyIds.length, games: deletedGames, decks: deletedDecks }
  })
}
