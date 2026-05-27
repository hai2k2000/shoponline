#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-/opt/shoponline/backups/postgres}"
CONTAINER="${POSTGRES_CONTAINER:-shoponline-postgres}"
USER="${POSTGRES_USER:-shoponline}"
TEMPLATE_DB="${POSTGRES_TEMPLATE_DB:-postgres}"
STAMP="$(date +%Y%m%d%H%M%S)"
VERIFY_DB="${VERIFY_DB:-shoponline_verify_$STAMP}"

if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE="$(find "$BACKUP_DIR" -type f -name 'shoponline-*.sql.gz' -print | sort | tail -n 1)"
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: ${BACKUP_FILE:-<latest in $BACKUP_DIR>}"
  exit 2
fi

cleanup() {
  docker exec "$CONTAINER" dropdb -U "$USER" --if-exists "$VERIFY_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Verifying backup gzip: $BACKUP_FILE"
gzip -t "$BACKUP_FILE"

echo "Creating temporary verification database: $VERIFY_DB"
docker exec "$CONTAINER" dropdb -U "$USER" --if-exists "$VERIFY_DB" >/dev/null 2>&1 || true
docker exec "$CONTAINER" createdb -U "$USER" "$VERIFY_DB"

echo "Restoring backup into temporary database"
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$USER" -d "$VERIFY_DB" -v ON_ERROR_STOP=1 >/dev/null

table_count="$(docker exec "$CONTAINER" psql -U "$USER" -d "$VERIFY_DB" -Atc "select count(*) from information_schema.tables where table_schema = 'public';")"
if [ "$table_count" -le 0 ]; then
  echo "Verification failed: restored database has no public tables"
  exit 1
fi

echo "Backup verification passed: $BACKUP_FILE ($table_count public tables restored)"
