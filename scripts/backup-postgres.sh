#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/opt/shoponline/backups/postgres}"
CONTAINER="${POSTGRES_CONTAINER:-shoponline-postgres}"
DB="${POSTGRES_DB:-shoponline}"
USER="${POSTGRES_USER:-shoponline}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/shoponline-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" | gzip > "$FILE"
find "$BACKUP_DIR" -type f -name 'shoponline-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "$FILE"
