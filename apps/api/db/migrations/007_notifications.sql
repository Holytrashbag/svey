-- Enum types
CREATE TYPE notification_type AS ENUM ('member_joined', 'member_approved', 'role_changed', 'deck_archidekt_deleted');

-- Tables

CREATE TABLE notification (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type            notification_type   NOT NULL,
    title           TEXT                NOT NULL,
    body            TEXT,
    playgroup_id    UUID                REFERENCES playgroup(id) ON DELETE CASCADE,
    deck_id         UUID                REFERENCES deck(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX notification_user_created_idx ON notification (user_id, created_at DESC);
CREATE INDEX notification_user_unread_idx  ON notification (user_id) WHERE read_at IS NULL;
