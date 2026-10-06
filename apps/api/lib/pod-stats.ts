import type { gameEndReasonEnum } from '../db/schema.ts'

export type GameEndReason = (typeof gameEndReasonEnum.enumValues)[number]

export type MemberResultRow = {
  playgroupMemberId: string | null
  endReason:         GameEndReason | null
  isWinner:          boolean
  n:                 number
}

export type MemberRecord = { wins: number; gamesPlayed: number }

export type PodGameAggRow = {
  endReason:    GameEndReason | null
  games:        number
  thisMonth:    number
  timedGames:   number
  timedSeconds: number
}

export type PodGameSummary = { totalGames: number; thisMonth: number; avgLength: number }

export function isFinishedGame(_endReason: GameEndReason | null): boolean {
  throw new Error('not implemented')
}

export function tallyMemberRecords(_rows: readonly MemberResultRow[]): Map<string, MemberRecord> {
  throw new Error('not implemented')
}

export function winRate(_wins: number, _gamesPlayed: number): number | null {
  throw new Error('not implemented')
}

export function threatRating(_wins: number, _gamesPlayed: number): number {
  throw new Error('not implemented')
}

export function summarizePodGames(_rows: readonly PodGameAggRow[]): PodGameSummary {
  throw new Error('not implemented')
}
