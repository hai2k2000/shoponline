#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-}"
CONTAINER="${POSTGRES_CONTAINER:-shoponline-postgres}"
DB="${POSTGRES_DB:-shoponline}"
USER="${POSTGRES_USER:-shoponline}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: CONFIRM_RESTORE=yes ./scripts/restore-postgres.sh /path/to/backup.sql.gz"
  exit 2
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 2
fi

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Refusing to restore without CONFIRM_RESTORE=yes"
  echo "This operation overwrites database objects in $DB."
  exit 2
fi

echo "Restoring $BACKUP_FILE into $DB on $CONTAINER..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1
echo "Restore completed."
