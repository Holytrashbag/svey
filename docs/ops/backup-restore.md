# Backup & Restore

Operational runbook for Svey backups. Pairs with
[`scripts/backup-db.sh`](../../scripts/backup-db.sh) and
[`scripts/restore-db.sh`](../../scripts/restore-db.sh).

## What is backed up

| Item | How | Notes |
|---|---|---|
| PostgreSQL database | `pg_dump --clean --if-exists` → gzip | all app + auth data |
| Uploaded avatars | `tar -czf` of the uploads volume | `${DATA_DIR:-/mnt/data}/uploads` |

- **Encryption:** both artifacts are encrypted with **`age`** (asymmetric). The
  server holds only the **public** key, so it can create backups but cannot
  decrypt them. The **private** key is kept off-box and is required to restore.
- **Location:** `/opt/svey/backups` on the server, **mirrored off-site** to
  a Hetzner Storage Box (`rsync --delete`, so off-site == local retention).
- **Retention:** 14 days (`RETENTION_DAYS`), local and off-site.
- **Schedule:** nightly **03:17 Europe/Berlin** via `/etc/cron.d/svey-backup`.

> Hetzner's console "Backups" only image the server's **boot disk**, not attached
> volumes. Since the database and uploads live on the `/mnt/data` volume, this
> `pg_dump`/`tar` approach is what actually protects the data.

## One-time setup

### 1. Create the age keypair (on your laptop, NOT the server)

```bash
age-keygen -o svey-backup.key
# prints: Public key: age1.....
```

Store `svey-backup.key` somewhere safe and offline (password manager).
**If you lose it, the backups are unrecoverable. If it leaks, backups are
readable.** Never copy it onto the production server except briefly to restore.

### 2. Off-site Storage Box

1. Add the server's SSH public key to the Storage Box (Hetzner console, or
   `ssh-copy-id -p 23 u123456@u123456.your-storagebox.de`).
2. Create a dedicated subdirectory, e.g. `backups/svey`.

### 3. Backup config on the server

```bash
cp /opt/svey/scripts/backup.env.example /opt/svey/.backup.env
# then edit /opt/svey/.backup.env:
#   AGE_RECIPIENT=age1...   (the PUBLIC key from step 1)
#   STORAGEBOX_DEST=u123456@u123456.your-storagebox.de:backups/svey
#   RSYNC_RSH="ssh -p 23"
```

### 4. Tools + cron on an EXISTING server

New servers get this from `scripts/cloud-init.yaml` automatically. For the
already-running box:

```bash
sudo apt-get update && sudo apt-get install -y age rsync
echo '17 3 * * * deploy /bin/bash /opt/svey/scripts/backup-db.sh >> /opt/svey/backup.log 2>&1' \
  | sudo tee /etc/cron.d/svey-backup
```

(The deploy workflow ships `scripts/` to `/opt/svey/scripts` on the next
deploy. To get them there immediately, `scp -r scripts deploy@server:/opt/svey/`.)

### 5. First run

```bash
/bin/bash /opt/svey/scripts/backup-db.sh
ls -la /opt/svey/backups   # expect svey-db-*.sql.gz.age (+ uploads)
```

## Restore

Restoring requires the **private** key. Run on the server (docker + age present)
or anywhere you can reach the `db` container.

```bash
# Database — DESTRUCTIVE, overwrites current data:
AGE_IDENTITY=~/svey-backup.key \
  /bin/bash /opt/svey/scripts/restore-db.sh db \
  /opt/svey/backups/svey-db-YYYYMMDD-HHMMSS.sql.gz.age

# Uploads:
AGE_IDENTITY=~/svey-backup.key \
  /bin/bash /opt/svey/scripts/restore-db.sh uploads \
  /opt/svey/backups/svey-uploads-YYYYMMDD-HHMMSS.tar.gz.age
```

Delete the private key from the server again afterwards (`shred -u ~/svey-backup.key`).

## Restore drill (run quarterly — does NOT touch production)

Verifies that a backup actually decrypts and loads, using a throwaway container:

```bash
# 1. Throwaway Postgres
docker run -d --name sb-restore-test \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=test -e POSTGRES_DB=svey \
  postgres:17-alpine

# 2. Decrypt the newest dump and load it
latest=$(ls -t /opt/svey/backups/svey-db-*.sql.gz.age | head -1)
age -d -i ~/svey-backup.key "$latest" | gunzip \
  | docker exec -i sb-restore-test psql -v ON_ERROR_STOP=1 -U postgres -d svey

# 3. Sanity-check the restored data
docker exec sb-restore-test psql -U postgres -d svey -c '\dt'
docker exec sb-restore-test psql -U postgres -d svey -c 'select count(*) from "user";'

# 4. Clean up
docker rm -f sb-restore-test
```

Record the date of the last successful drill below.

| Date | Result | By |
|---|---|---|
| _pending first drill_ | | |

## Troubleshooting

- **`AGE_RECIPIENT not set`** — `.backup.env` missing or not readable. The script
  refuses to write unencrypted backups by design.
- **rsync fails** — check the Storage Box SSH key and that `RSYNC_RSH` uses port 23.
- **Logs** — cron output is appended to `/opt/svey/backup.log`.
