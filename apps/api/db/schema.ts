import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  unique,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Enums
export const playgroupMemberRoleEnum = pgEnum('playgroup_member_role', ['admin', 'member'])
export const gameStatusEnum = pgEnum('game_status', ['active', 'completed'])
export const gameEndReasonEnum = pgEnum('game_end_reason', ['won', 'draw', 'abandoned'])
export const deathCauseEnum = pgEnum('death_cause', ['life', 'cmdr_dmg', 'poison', 'conceded', 'special', 'none'])
export const notificationTypeEnum = pgEnum('notification_type', ['member_joined', 'member_approved', 'role_changed', 'deck_archidekt_deleted'])

// Tables

export const playgroup = pgTable('playgroup', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name:        text('name').notNull(),
  description: text('description'),
  inviteCode:  text('invite_code').notNull().unique(),
  createdBy:   uuid('created_by').notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const playgroupMember = pgTable('playgroup_member', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  playgroupId:  uuid('playgroup_id').notNull().references(() => playgroup.id, { onDelete: 'cascade' }),
  userId:       uuid('user_id'),
  displayName:  text('display_name').notNull(),
  role:         playgroupMemberRoleEnum('role').notNull().default('member'),
  isPending:    boolean('is_pending').notNull().default(false),
  joinedAt:     timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique().on(t.playgroupId, t.userId),
])

export const deck = pgTable('deck', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId:      uuid('owner_user_id').notNull(),
  name:             text('name').notNull(),
  archidektId:      text('archidekt_id'),
  bracketEstimated: integer('bracket_estimated').notNull(),
  bracketOverride:  integer('bracket_override'),
  archidektDeleted: boolean('archidekt_deleted').notNull().default(false),
  isArchived:       boolean('is_archived').notNull().default(false),
  colorIdentity:    text('color_identity').array().notNull().default(sql`'{}'::text[]`),
  lastSyncedAt:     timestamp('last_synced_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const decklistCard = pgTable('decklist_card', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deckId:      uuid('deck_id').notNull().references(() => deck.id, { onDelete: 'cascade' }),
  cardName:    text('card_name').notNull(),
  scryfallId:  text('scryfall_id').notNull(),
  isCommander: boolean('is_commander').notNull().default(false),
  quantity:    integer('quantity').notNull().default(1),
  cardType:    text('card_type').notNull().default(''),
  manaCost:    text('mana_cost').notNull().default(''),
  cmc:         doublePrecision('cmc').notNull().default(0),
  saltScore:   doublePrecision('salt_score').notNull().default(0),
  syncedAt:    timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
})

export const game = pgTable('game', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  playgroupId:     uuid('playgroup_id').notNull().references(() => playgroup.id),
  hostUserId:      uuid('host_user_id').notNull(),
  status:          gameStatusEnum('status').notNull().default('active'),
  endReason:       gameEndReasonEnum('end_reason'),
  abandonReasons:  jsonb('abandon_reasons'),
  abandonNotes:    text('abandon_notes'),
  durationSeconds: integer('duration_seconds'),
  startedAt:       timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt:         timestamp('ended_at', { withTimezone: true }),
})

export const gamePlayer = pgTable('game_player', {
  id:                  uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gameId:              uuid('game_id').notNull().references(() => game.id, { onDelete: 'cascade' }),
  playgroupMemberId:   uuid('playgroup_member_id').references(() => playgroupMember.id, { onDelete: 'set null' }),
  deckId:              uuid('deck_id').notNull().references(() => deck.id),
  guestName:           text('guest_name'),
  turnOrder:           integer('turn_order').notNull(),
  finalLife:           integer('final_life').notNull().default(40),
  poisonCounters:      integer('poison_counters').notNull().default(0),
  deathCause:          deathCauseEnum('death_cause').notNull().default('none'),
  diedAt:              timestamp('died_at', { withTimezone: true }),
  isWinner:            boolean('is_winner').notNull().default(false),
})

export const gameDecklistCard = pgTable('game_decklist_card', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gameId:         uuid('game_id').notNull().references(() => game.id, { onDelete: 'cascade' }),
  deckId:         uuid('deck_id').notNull().references(() => deck.id),
  cardName:       text('card_name').notNull(),
  scryfallId:     text('scryfall_id').notNull(),
  isCommander:    boolean('is_commander').notNull().default(false),
  snapshottedAt:  timestamp('snapshotted_at', { withTimezone: true }).notNull().defaultNow(),
})

export const commanderDamage = pgTable('commander_damage', {
  id:                        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gameId:                    uuid('game_id').notNull().references(() => game.id, { onDelete: 'cascade' }),
  sourceGameDecklistCardId:  uuid('source_game_decklist_card_id').notNull().references(() => gameDecklistCard.id),
  sourceGamePlayerId:        uuid('source_game_player_id').notNull().references(() => gamePlayer.id),
  targetGamePlayerId:        uuid('target_game_player_id').notNull().references(() => gamePlayer.id),
  damage:                    integer('damage').notNull(),
})

export const surveyResponse = pgTable('survey_response', {
  id:            uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gameId:        uuid('game_id').notNull().references(() => game.id, { onDelete: 'cascade' }),
  gamePlayerId:  uuid('game_player_id').notNull().references(() => gamePlayer.id, { onDelete: 'cascade' }),
  funRating:     integer('fun_rating'),
  agencyRating:  integer('agency_rating'),
  takeaway:      text('takeaway'),
  submittedAt:   timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique().on(t.gameId, t.gamePlayerId),
  check('fun_rating_range',     sql`${t.funRating} between 1 and 5`),
  check('agency_rating_range',  sql`${t.agencyRating} between 1 and 5`),
])

/** Interpolation values for client-side localized notification copy. */
export type NotificationParams = Record<string, string>

export const notification = pgTable('notification', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:      uuid('user_id').notNull(),
  type:        notificationTypeEnum('type').notNull(),
  title:       text('title').notNull(),
  body:        text('body'),
  params:      jsonb('params').$type<NotificationParams>(),
  playgroupId: uuid('playgroup_id').references(() => playgroup.id, { onDelete: 'cascade' }),
  deckId:      uuid('deck_id').references(() => deck.id, { onDelete: 'cascade' }),
  readAt:      timestamp('read_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Relations

export const playgroupRelations = relations(playgroup, ({ many }) => ({
  members: many(playgroupMember),
  games:   many(game),
}))

export const playgroupMemberRelations = relations(playgroupMember, ({ one, many }) => ({
  playgroup:   one(playgroup,  { fields: [playgroupMember.playgroupId], references: [playgroup.id] }),
  gamePlayers: many(gamePlayer),
}))

export const deckRelations = relations(deck, ({ many }) => ({
  decklistCards:     many(decklistCard),
  gamePlayers:       many(gamePlayer),
  gameDecklistCards: many(gameDecklistCard),
}))

export const decklistCardRelations = relations(decklistCard, ({ one }) => ({
  deck: one(deck, { fields: [decklistCard.deckId], references: [deck.id] }),
}))

export const gameRelations = relations(game, ({ one, many }) => ({
  playgroup:        one(playgroup, { fields: [game.playgroupId], references: [playgroup.id] }),
  players:          many(gamePlayer),
  decklistCards:    many(gameDecklistCard),
  commanderDamages: many(commanderDamage),
  surveyResponses:  many(surveyResponse),
}))

export const gamePlayerRelations = relations(gamePlayer, ({ one, many }) => ({
  game:            one(game,            { fields: [gamePlayer.gameId],            references: [game.id] }),
  playgroupMember: one(playgroupMember, { fields: [gamePlayer.playgroupMemberId], references: [playgroupMember.id] }),
  deck:            one(deck,            { fields: [gamePlayer.deckId],            references: [deck.id] }),
  commanderDamagesDealt:    many(commanderDamage, { relationName: 'sourcePlayer' }),
  commanderDamagesReceived: many(commanderDamage, { relationName: 'targetPlayer' }),
  surveyResponse:  one(surveyResponse, { fields: [gamePlayer.id], references: [surveyResponse.gamePlayerId] }),
}))

export const gameDecklistCardRelations = relations(gameDecklistCard, ({ one, many }) => ({
  game:             one(game, { fields: [gameDecklistCard.gameId], references: [game.id] }),
  deck:             one(deck, { fields: [gameDecklistCard.deckId], references: [deck.id] }),
  commanderDamages: many(commanderDamage, { relationName: 'sourceCard' }),
}))

export const commanderDamageRelations = relations(commanderDamage, ({ one }) => ({
  game:         one(game,             { fields: [commanderDamage.gameId],                    references: [game.id] }),
  sourceCard:   one(gameDecklistCard, { fields: [commanderDamage.sourceGameDecklistCardId],  references: [gameDecklistCard.id], relationName: 'sourceCard' }),
  sourcePlayer: one(gamePlayer,       { fields: [commanderDamage.sourceGamePlayerId],        references: [gamePlayer.id], relationName: 'sourcePlayer' }),
  targetPlayer: one(gamePlayer,       { fields: [commanderDamage.targetGamePlayerId],        references: [gamePlayer.id], relationName: 'targetPlayer' }),
}))

export const surveyResponseRelations = relations(surveyResponse, ({ one }) => ({
  game:       one(game,       { fields: [surveyResponse.gameId],       references: [game.id] }),
  gamePlayer: one(gamePlayer, { fields: [surveyResponse.gamePlayerId], references: [gamePlayer.id] }),
}))

export const notificationRelations = relations(notification, ({ one }) => ({
  playgroup: one(playgroup, { fields: [notification.playgroupId], references: [playgroup.id] }),
  deck:      one(deck,      { fields: [notification.deckId],      references: [deck.id] }),
}))

// Inferred types
export type Playgroup = typeof playgroup.$inferSelect
export type NewPlaygroup = typeof playgroup.$inferInsert
export type PlaygroupMember = typeof playgroupMember.$inferSelect
export type NewPlaygroupMember = typeof playgroupMember.$inferInsert
export type Deck = typeof deck.$inferSelect
export type NewDeck = typeof deck.$inferInsert
export type DecklistCard = typeof decklistCard.$inferSelect
export type NewDecklistCard = typeof decklistCard.$inferInsert
export type Game = typeof game.$inferSelect
export type NewGame = typeof game.$inferInsert
export type GamePlayer = typeof gamePlayer.$inferSelect
export type NewGamePlayer = typeof gamePlayer.$inferInsert
export type GameDecklistCard = typeof gameDecklistCard.$inferSelect
export type NewGameDecklistCard = typeof gameDecklistCard.$inferInsert
export type CommanderDamage = typeof commanderDamage.$inferSelect
export type NewCommanderDamage = typeof commanderDamage.$inferInsert
export type SurveyResponse = typeof surveyResponse.$inferSelect
export type NewSurveyResponse = typeof surveyResponse.$inferInsert
export type Notification = typeof notification.$inferSelect
export type NewNotification = typeof notification.$inferInsert
