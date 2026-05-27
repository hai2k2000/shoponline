#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SKIP_BACKUP="${SKIP_BACKUP:-no}"
SKIP_BACKUP_VERIFY="${SKIP_BACKUP_VERIFY:-no}"
SKIP_BUILD="${SKIP_BUILD:-no}"
SKIP_REGRESSION="${SKIP_REGRESSION:-no}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-3}"
WEB_CONTAINER="${WEB_CONTAINER:-shoponline-web}"

cd "$ROOT_DIR"

log() {
  printf '%s %s\n' "[$(date '+%Y-%m-%d %H:%M:%S')]" "$*"
}

wait_for_health() {
  attempt=1
  while [ "$attempt" -le "$HEALTH_RETRIES" ]; do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$WEB_CONTAINER" 2>/dev/null || true)"
    if [ "$status" = "healthy" ]; then
      log "$WEB_CONTAINER is healthy"
      return 0
    fi
    log "Waiting for $WEB_CONTAINER health: ${status:-missing} ($attempt/$HEALTH_RETRIES)"
    sleep "$HEALTH_SLEEP_SECONDS"
    attempt=$((attempt + 1))
  done
  log "$WEB_CONTAINER did not become healthy"
  docker compose ps
  docker logs --tail 120 "$WEB_CONTAINER" || true
  exit 1
}

log "Starting ShopOnline production deploy"

if [ "$SKIP_BACKUP" != "yes" ]; then
  backup_file="$(npm run --silent backup:postgres)"
  if [ ! -s "$backup_file" ]; then
    log "Backup failed or empty: $backup_file"
    exit 1
  fi
  log "Postgres backup created: $backup_file"
  if [ "$SKIP_BACKUP_VERIFY" != "yes" ]; then
    log "Verifying Postgres backup restore"
    npm run --silent backup:verify -- "$backup_file"
  else
    log "Skipping Postgres backup verification because SKIP_BACKUP_VERIFY=yes"
  fi
else
  log "Skipping Postgres backup because SKIP_BACKUP=yes"
fi

if [ "$SKIP_BUILD" != "yes" ]; then
  log "Running application build"
  npm run build
else
  log "Skipping application build because SKIP_BUILD=yes"
fi

log "Rebuilding and restarting web container"
docker compose up -d --build web
wait_for_health

if [ "$SKIP_REGRESSION" != "yes" ]; then
  log "Running full regression smoke"
  npm run smoke:regression
else
  log "Skipping regression because SKIP_REGRESSION=yes"
fi

log "ShopOnline production deploy completed"
