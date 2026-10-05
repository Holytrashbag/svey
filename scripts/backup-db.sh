#!/usr/bin/env bash
#
# Nightly ENCRYPTED backup for Svey (database + uploaded avatars).
#
#   - Dumps the `db` container with pg_dump and gzips it.
#   - Archives the uploads directory (avatars) and gzips it.
#   - Encrypts both with `age` (asymmetric): the server only holds the PUBLIC
#     key, so a compromised server cannot decrypt its own backups. The private
#     key is kept off-box and is only needed to restore (see restore-db.sh and
#     docs/ops/backup-restore.md).
#   - Prunes local copies older than RETENTION_DAYS.
#   - Mirrors the backup directory off-site to a Hetzner Storage Box via rsync.
#
# Config: DB credentials come from the running container; off-site target and
# the age recipient come from $BACKUP_ENV_FILE (see scripts/backup.env.example).
#
# Cron (deploy user, 03:17 Europe/Berlin):
#   17 3 * * * /bin/bash /opt/svey/scripts/backup-db.sh >> /opt/svey/backup.log 2>&1
#
set -euo pipefail

# ── Config (override via environment or $BACKUP_ENV_FILE) ──
PROJECT_DIR="${PROJECT_DIR:-/opt/svey}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env.prod}"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-$PROJECT_DIR/.backup.env}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Backup-specific config (off-site target + age recipient). Safe to source: this
# file is created from scripts/backup.env.example with quoted values.
if [ -f "$BACKUP_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$BACKUP_ENV_FILE"
  set +a
fi

STORAGEBOX_DEST="${STORAGEBOX_DEST:-}"
RSYNC_RSH="${RSYNC_RSH:-ssh -p 23}"
AGE_RECIPIENT="${AGE_RECIPIENT:-}"

# Uploads live on the host data volume (the same bind mount the api uses). Read
# DATA_DIR from .env.prod WITHOUT shell-sourcing it — that file may contain
# values like EMAIL_FROM="Name <a@b>" which are not valid shell.
data_dir="$(grep -E '^DATA_DIR=' "$ENV_FILE" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"' || true)"
UPLOADS_DIR="${UPLOADS_DIR:-${data_dir:-/mnt/data}/uploads}"

# ── Encryption is mandatory — never write plaintext personal data off-box. ──
if [ -z "$AGE_RECIPIENT" ]; then
  echo "[backup] ERROR: AGE_RECIPIENT not set; refusing to write unencrypted backups." >&2
  echo "[backup] Configure $BACKUP_ENV_FILE (see scripts/backup.env.example)." >&2
  exit 1
fi
command -v age >/dev/null || { echo "[backup] ERROR: 'age' is not installed." >&2; exit 1; }

dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

mkdir -p "$BACKUP_DIR"
find "$BACKUP_DIR" -name '*.tmp' -delete 2>/dev/null || true  # clear partial files from a failed run
ts="$(date +%Y%m%d-%H%M%S)"
db_out="$BACKUP_DIR/svey-db-$ts.sql.gz.age"
uploads_out="$BACKUP_DIR/svey-uploads-$ts.tar.gz.age"

echo "[backup] Dumping database -> $db_out"
# pg_dump runs inside the container and uses the container's own POSTGRES_* env.
# Write to .tmp first, then atomically rename, so a failed dump never leaves a
# truncated file that could be shipped off-site.
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  | gzip -9 | age -r "$AGE_RECIPIENT" > "$db_out.tmp"
mv "$db_out.tmp" "$db_out"

if [ -d "$UPLOADS_DIR" ] && [ -n "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
  echo "[backup] Archiving uploads ($UPLOADS_DIR) -> $uploads_out"
  tar -czf - -C "$UPLOADS_DIR" . | age -r "$AGE_RECIPIENT" > "$uploads_out.tmp"
  mv "$uploads_out.tmp" "$uploads_out"
else
  echo "[backup] NOTE: $UPLOADS_DIR missing or empty — skipping uploads archive."
fi

echo "[backup] Pruning local backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'svey-*.age' -mtime +"$RETENTION_DAYS" -delete

if [ -n "$STORAGEBOX_DEST" ]; then
  echo "[backup] Mirroring $BACKUP_DIR -> $STORAGEBOX_DEST (off-site)"
  # --delete mirrors local retention to the Storage Box (only ciphertext leaves).
  rsync -az --delete -e "$RSYNC_RSH" "$BACKUP_DIR"/ "$STORAGEBOX_DEST"/
else
  echo "[backup] NOTE: STORAGEBOX_DEST not set — keeping backups on-box only."
fi

echo "[backup] Done ($ts)."
