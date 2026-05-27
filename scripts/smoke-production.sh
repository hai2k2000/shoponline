#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://127.0.0.1:3002}"
RETRIES="${RETRIES:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-3}"

check() {
  path="$1"
  attempt=1
  while [ "$attempt" -le "$RETRIES" ]; do
    code="$(curl -k -s -o /tmp/shoponline-smoke-body -w '%{http_code}' "$BASE_URL$path" || true)"
    if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
      echo "OK $path HTTP $code"
      return 0
    fi
    if [ "$attempt" -lt "$RETRIES" ]; then
      sleep "$SLEEP_SECONDS"
    fi
    attempt=$((attempt + 1))
  done
  echo "FAIL $path HTTP $code"
  cat /tmp/shoponline-smoke-body
  exit 1
}

check "/api/health"
check "/"
check "/products"
check "/cart"
check "/checkout"
check "/tracking"
check "/admin/login"

echo "ShopOnline smoke passed for $BASE_URL"
