-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE playgroup_member_role AS ENUM ('admin', 'member');
CREATE TYPE game_status AS ENUM ('active', 'completed');
CREATE TYPE game_end_reason AS ENUM ('won', 'draw', 'abandoned');
CREATE TYPE death_cause AS ENUM ('life', 'cmdr_dmg', 'poison', 'conceded', 'special', 'none');

-- NOTE: "user", "oauth_account", "session", and "verification" tables are created
-- by better-auth (000_better_auth_schema.sql). This file only contains app tables.

-- Tables

CREATE TABLE playgroup (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    description TEXT,
    created_by  UUID        NOT NULL REFERENCES "user"(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE playgroup_member (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    playgroup_id    UUID                    NOT NULL REFERENCES playgroup(id) ON DELETE CASCADE,
    user_id         UUID                    REFERENCES "user"(id) ON DELETE SET NULL,
    display_name    TEXT                    NOT NULL,
    role            playgroup_member_role   NOT NULL DEFAULT 'member',
    is_pending      BOOLEAN                 NOT NULL DEFAULT false,
    joined_at       TIMESTAMPTZ             NOT NULL DEFAULT now(),
    UNIQUE (playgroup_id, user_id)
);

CREATE TABLE deck (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id       UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name                TEXT        NOT NULL,
    archidekt_id        TEXT,
    bracket_estimated   INT         NOT NULL,
    bracket_override    INT,
    archidekt_deleted   BOOLEAN     NOT NULL DEFAULT false,
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE decklist_card (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id         UUID        NOT NULL REFERENCES deck(id) ON DELETE CASCADE,
    card_name       TEXT        NOT NULL,
    scryfall_id     TEXT        NOT NULL,
    is_commander    BOOLEAN     NOT NULL DEFAULT false,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE game (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    playgroup_id        UUID            NOT NULL REFERENCES playgroup(id),
    host_user_id        UUID            NOT NULL REFERENCES "user"(id),
    status              game_status     NOT NULL DEFAULT 'active',
    end_reason          game_end_reason,
    abandon_reasons     JSONB,
    abandon_notes       TEXT,
    duration_seconds    INT,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    ended_at            TIMESTAMPTZ
);

CREATE TABLE game_player (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id                 UUID        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    playgroup_member_id     UUID        REFERENCES playgroup_member(id) ON DELETE SET NULL,
    deck_id                 UUID        NOT NULL REFERENCES deck(id),
    guest_name              TEXT,
    turn_order              INT         NOT NULL,
    final_life              INT         NOT NULL DEFAULT 40,
    poison_counters         INT         NOT NULL DEFAULT 0,
    death_cause             death_cause NOT NULL DEFAULT 'none',
    died_at                 TIMESTAMPTZ,
    is_winner               BOOLEAN     NOT NULL DEFAULT false
);

CREATE TABLE game_decklist_card (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id         UUID        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    deck_id         UUID        NOT NULL REFERENCES deck(id),
    card_name       TEXT        NOT NULL,
    scryfall_id     TEXT        NOT NULL,
    is_commander    BOOLEAN     NOT NULL DEFAULT false,
    snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commander_damage (
    id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id                     UUID    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    source_game_decklist_card_id UUID   NOT NULL REFERENCES game_decklist_card(id),
    source_game_player_id       UUID    NOT NULL REFERENCES game_player(id),
    target_game_player_id       UUID    NOT NULL REFERENCES game_player(id),
    damage                      INT     NOT NULL
);

CREATE TABLE survey_response (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id         UUID        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    game_player_id  UUID        NOT NULL REFERENCES game_player(id) ON DELETE CASCADE,
    fun_rating      INT         CHECK (fun_rating BETWEEN 1 AND 5),
    agency_rating   INT         CHECK (agency_rating BETWEEN 1 AND 5),
    takeaway        TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (game_id, game_player_id)
);

-- Indexes
CREATE INDEX ON playgroup_member (playgroup_id);
CREATE INDEX ON playgroup_member (user_id);
CREATE INDEX ON deck (owner_user_id);
CREATE INDEX ON decklist_card (deck_id);
CREATE INDEX ON game (playgroup_id);
CREATE INDEX ON game (host_user_id);
CREATE INDEX ON game_player (game_id);
CREATE INDEX ON game_player (deck_id);
CREATE INDEX ON game_player (playgroup_member_id);
CREATE INDEX ON game_decklist_card (game_id, deck_id);
CREATE INDEX ON commander_damage (game_id);
CREATE INDEX ON commander_damage (target_game_player_id);
CREATE INDEX ON survey_response (game_id);
CREATE INDEX ON survey_response (game_player_id);

-- Views

CREATE VIEW deck_stat_view AS
WITH per_playgroup AS (
    SELECT
        gp.deck_id,
        g.playgroup_id,
        COUNT(*)                                                                        AS games_played,
        SUM(gp.is_winner::int)                                                          AS wins,
        AVG(EXTRACT(EPOCH FROM (COALESCE(gp.died_at, g.ended_at) - g.started_at)))     AS avg_survival_time_seconds,
        SUM(CASE WHEN gp.death_cause = 'conceded' THEN 1 ELSE 0 END)                   AS times_conceded
    FROM game_player gp
    JOIN game g ON g.id = gp.game_id
    WHERE g.status = 'completed'
    GROUP BY gp.deck_id, g.playgroup_id
),
survey_per_playgroup AS (
    SELECT
        gp.deck_id,
        g.playgroup_id,
        AVG(sr.fun_rating)      AS avg_fun_rating,
        AVG(sr.agency_rating)   AS avg_agency_rating
    FROM survey_response sr
    JOIN game_player gp ON gp.id = sr.game_player_id
    JOIN game g ON g.id = sr.game_id
    WHERE g.status = 'completed'
    GROUP BY gp.deck_id, g.playgroup_id
)
-- Per-playgroup rows
SELECT
    s.deck_id,
    s.playgroup_id,
    s.games_played,
    s.wins,
    CASE WHEN s.games_played > 0 THEN s.wins::float / s.games_played ELSE 0 END AS win_rate,
    r.avg_fun_rating,
    r.avg_agency_rating,
    s.avg_survival_time_seconds,
    s.times_conceded
FROM per_playgroup s
LEFT JOIN survey_per_playgroup r ON r.deck_id = s.deck_id AND r.playgroup_id = s.playgroup_id

UNION ALL

-- Cross-group rows (playgroup_id IS NULL)
SELECT
    s.deck_id,
    NULL::uuid                                                                              AS playgroup_id,
    SUM(s.games_played)                                                                     AS games_played,
    SUM(s.wins)                                                                             AS wins,
    CASE WHEN SUM(s.games_played) > 0 THEN SUM(s.wins)::float / SUM(s.games_played) ELSE 0 END AS win_rate,
    AVG(r.avg_fun_rating)                                                                   AS avg_fun_rating,
    AVG(r.avg_agency_rating)                                                                AS avg_agency_rating,
    AVG(s.avg_survival_time_seconds)                                                        AS avg_survival_time_seconds,
    SUM(s.times_conceded)                                                                   AS times_conceded
FROM per_playgroup s
LEFT JOIN survey_per_playgroup r ON r.deck_id = s.deck_id AND r.playgroup_id = s.playgroup_id
GROUP BY s.deck_id;

CREATE VIEW player_stat_view AS
WITH per_deck AS (
    SELECT
        gp.playgroup_member_id,
        pm.playgroup_id,
        gp.deck_id,
        COUNT(*)                                                                        AS games_played,
        SUM(gp.is_winner::int)                                                          AS wins,
        AVG(EXTRACT(EPOCH FROM (COALESCE(gp.died_at, g.ended_at) - g.started_at)))     AS avg_survival_time_seconds
    FROM game_player gp
    JOIN playgroup_member pm ON pm.id = gp.playgroup_member_id
    JOIN game g ON g.id = gp.game_id
    WHERE gp.playgroup_member_id IS NOT NULL
      AND g.status = 'completed'
    GROUP BY gp.playgroup_member_id, pm.playgroup_id, gp.deck_id
)
-- Per-deck rows
SELECT
    playgroup_member_id,
    playgroup_id,
    deck_id,
    games_played,
    wins,
    CASE WHEN games_played > 0 THEN wins::float / games_played ELSE 0 END AS win_rate,
    avg_survival_time_seconds
FROM per_deck

UNION ALL

-- All-decks rows (deck_id IS NULL)
SELECT
    playgroup_member_id,
    playgroup_id,
    NULL::uuid                                                                              AS deck_id,
    SUM(games_played)                                                                       AS games_played,
    SUM(wins)                                                                               AS wins,
    CASE WHEN SUM(games_played) > 0 THEN SUM(wins)::float / SUM(games_played) ELSE 0 END   AS win_rate,
    AVG(avg_survival_time_seconds)                                                          AS avg_survival_time_seconds
FROM per_deck
GROUP BY playgroup_member_id, playgroup_id;
