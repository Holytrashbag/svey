// Single source of truth for all API request/response shapes.
// Stores import from here; never define duplicate types in store files.

// ── Decks ─────────────────────────────────────────────────────────────────────

export type DeckListItem = {
  id:            string
  name:          string
  commander:     string | null
  colorIdentity: string[]
  bracket:       number
  isArchived:    boolean
  archidektId:   string | null
  lastSyncedAt:  string | null
  wins:          number
  losses:        number
}

export type DeckCard = {
  name:        string
  scryfallId:  string
  isCommander: boolean
  quantity:    number
  cardType:    string
  manaCost:    string
  cmc:         number
  saltScore:   number
}

export type DeckDetail = {
  id:               string
  name:             string
  commander:        string | null
  colorIdentity:    string[]
  bracket:          number
  bracketEstimated: number
  bracketOverride:  number | null
  isArchived:       boolean
  archidektId:      string | null
  archidektDeleted: boolean
  lastSyncedAt:     string | null
  createdAt:        string
  saltSum:          number
  cards:            DeckCard[]
}

export type DeckMatchupStat = {
  deckId:    string
  commander: string | null
  games:     number
  winrate:   number
}

export type DeckStatScope = {
  games:               number
  wins:                number
  losses:              number
  winrate:             number
  avgPlacement:        number | null
  avgSurvivalMinutes:  number | null
  avgFunRating:        number | null
  eliminated:          number
  recentResults:       ('W' | 'L')[]
  matchups:            DeckMatchupStat[]
}

export type DeckStats = {
  mine:    DeckStatScope | null
  general: DeckStatScope | null
}

// ── Games ─────────────────────────────────────────────────────────────────────

export type GameDetailPlayer = {
  name:       string
  isGuest:    boolean
  deck:       { name: string; commander: string | null } | null
  finalLife:  number
  isWinner:   boolean
  deathCause: string
  deathAt:    number | null
  /** Survey note, visible to every pod member; null when the player left none. */
  note:       string | null
}

export type GameDetail = {
  id:          string
  playgroup:   { id: string; name: string }
  playedAt:    string
  durationSec: number
  endReason:   string
  players:     GameDetailPlayer[]
  survey:      { avgFun: number | null; avgAgency: number | null; responseCount: number } | null
  /** Retire reason ids and notes; empty/null unless endReason is 'abandoned'. */
  abandonReasons: string[]
  abandonNotes:   string | null
}

export type CreateGamePlayer = {
  name:           string
  isGuest:        boolean
  memberId:       string | null
  deckId:         string
  finalLife:      number
  poison:         number
  deathCause:     'life' | 'cmdr_dmg' | 'poison' | 'conceded' | 'special' | 'none'
  deathAt:        number | null
  isWinner:       boolean
  surveyFun:      number | null
  surveyAgency:   number | null
  surveyTakeaway: string
}

export type CreateGameBody = {
  podId:       string
  durationSec: number
  endReason:   'won' | 'draw' | 'abandoned'
  abandonReasons?: string[]
  abandonNotes?: string
  players:     CreateGamePlayer[]
}

// ── Playgroups ────────────────────────────────────────────────────────────────

export type PodMemberItem = {
  id:        string
  name:      string
  you?:      boolean
  avatarUrl: string | null
}

export type ActivePlaygroupItem = {
  id:           string
  name:         string
  members:      PodMemberItem[]
  lastPlayed:   string | null
  record:       { wins: number; losses: number }
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

export type PlaygroupMemberDetail = {
  id:        string
  name:      string
  online:    boolean
  role:      'admin' | 'member'
  mainDeck:  string | null
  /** Wins in finished games in this pod */
  wins:      number
  /** Finished games (won or draw) played in this pod; retired games excluded */
  gamesPlayed: number
  /** Integer %, wins / gamesPlayed; null when the member hasn't played */
  winRate:   number | null
  threat:    number
  you:       boolean
  avatarUrl: string | null
  joinedAt:  string
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

/** A non-archived deck of an active pod member, as offered in game setup. */
export type PodDeckItem = {
  id:            string
  ownerMemberId: string
  name:          string
  commander:     string | null
  colorIdentity: string[]
  bracket:       number
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type PlayerStats = {
  totalGames:   number
  totalWins:    number
  /** Finished games only; null when there are none. */
  winRate:      number | null
  avgPlacement: number | null
}

export type PlayerDeckStat = {
  deckId:       string
  deckName:     string
  commander:    string | null
  isOwner:      boolean
  games:        number
  wins:         number
  losses:       number
  winrate:      number
  avgPlacement: number | null
}

// ── Notifications ─────────────────────────────────────────────────────────────

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
  /** Interpolation values for localized copy; null on rows predating it. */
  params:      Record<string, string> | null
  playgroupId: string | null
  deckId:      string | null
  read:        boolean
  createdAt:   string
}
