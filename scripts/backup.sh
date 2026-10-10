#!/usr/bin/env bash
# Nightly AVRMD backup: Postgres, the robot's data/ files, and uploaded media.
# Run by ~/.config/systemd/user/avrmd-backup.timer. Keeps 14 days locally.
#
#   scripts/backup.sh            # back up now
#   scripts/backup.sh --verify   # back up, then restore the dump into a
#                                # scratch database and count rows
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
dest="${AVRMD_BACKUP_DIR:-$HOME/avrmd-backups}"
stamp="$(date -u +%Y%m%d-%H%M)"
mkdir -p "$dest/media"
chmod 700 "$dest"

# 1. Database: custom format, restorable with pg_restore.
docker exec avrmd-db pg_dump -U avrmd -Fc avrmd > "$dest/db-$stamp.dump.tmp"
mv "$dest/db-$stamp.dump.tmp" "$dest/db-$stamp.dump"

# 2. Robot output and the catalog (some of it is gitignored, so git is no backup).
tar -czf "$dest/data-$stamp.tgz" -C "$repo" data

# 3. Uploaded media: an incremental mirror of the bucket.
set -a; . "$repo/.env"; set +a
node "$repo/scripts/backup-media.mjs" "$dest/media"

# 4. Keep 14 days.
find "$dest" -maxdepth 1 -name 'db-*.dump' -mtime +14 -delete
find "$dest" -maxdepth 1 -name 'data-*.tgz' -mtime +14 -delete

echo "backup ok: db-$stamp.dump ($(du -h "$dest/db-$stamp.dump" | cut -f1)), data-$stamp.tgz"

if [[ "${1:-}" == "--verify" ]]; then
  scratch="avrmd_restore_check"
  docker exec avrmd-db dropdb -U avrmd --if-exists "$scratch"
  docker exec avrmd-db createdb -U avrmd "$scratch"
  docker exec -i avrmd-db pg_restore -U avrmd -d "$scratch" --no-owner < "$dest/db-$stamp.dump"
  docker exec avrmd-db psql -U avrmd -d "$scratch" -tAc \
    "select 'users=' || (select count(*) from users) || ' questions=' || (select count(*) from questions) || ' tables=' || (select count(*) from information_schema.tables where table_schema='public')"
  docker exec avrmd-db dropdb -U avrmd "$scratch"
  echo "restore check ok"
fi
