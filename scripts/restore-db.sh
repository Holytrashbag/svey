#!/usr/bin/env bash
#
# Restore a Svey backup produced by scripts/backup-db.sh.
#
# Decrypts an age-encrypted backup with your OFF-server private key and restores
# it. The `db` restore is DESTRUCTIVE (the dump was taken with --clean).
#
# Usage:
#   AGE_IDENTITY=~/svey-backup.key \
#     scripts/restore-db.sh db      /opt/svey/backups/svey-db-YYYYMMDD-HHMMSS.sql.gz.age
#
#   AGE_IDENTITY=~/svey-backup.key \
#     scripts/restore-db.sh uploads /opt/svey/backups/svey-uploads-YYYYMMDD-HHMMSS.tar.gz.age
#
# See docs/ops/backup-restore.md for the full procedure and a safe restore drill.
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/svey}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env.prod}"
AGE_IDENTITY="${AGE_IDENTITY:-}"

kind="${1:-}"
infile="${2:-}"

[ -n "$kind" ] && [ -n "$infile" ] || { echo "Usage: $0 <db|uploads> <file.age>" >&2; exit 1; }
[ -n "$AGE_IDENTITY" ] || { echo "ERROR: set AGE_IDENTITY=<path to your age private key>." >&2; exit 1; }
[ -f "$AGE_IDENTITY" ] || { echo "ERROR: identity file not found: $AGE_IDENTITY" >&2; exit 1; }
[ -f "$infile" ] || { echo "ERROR: backup file not found: $infile" >&2; exit 1; }
command -v age >/dev/null || { echo "ERROR: 'age' is not installed." >&2; exit 1; }

dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
confirm() { read -r -p "$1 Type 'yes' to continue: " a; [ "$a" = yes ] || { echo "Aborted."; exit 1; }; }

case "$kind" in
  db)
    confirm "This OVERWRITES the current database from $infile."
    age -d -i "$AGE_IDENTITY" "$infile" | gunzip \
      | dc exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    echo "Database restore complete."
    ;;
  uploads)
    data_dir="$(grep -E '^DATA_DIR=' "$ENV_FILE" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"' || true)"
    UPLOADS_DIR="${UPLOADS_DIR:-${data_dir:-/mnt/data}/uploads}"
    confirm "This extracts uploads into $UPLOADS_DIR from $infile."
    mkdir -p "$UPLOADS_DIR"
    age -d -i "$AGE_IDENTITY" "$infile" | tar -xzf - -C "$UPLOADS_DIR"
    echo "Uploads restore complete ($UPLOADS_DIR)."
    ;;
  *)
    echo "ERROR: unknown kind '$kind' (use db|uploads)." >&2
    exit 1
    ;;
esac
