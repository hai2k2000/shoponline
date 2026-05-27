#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://127.0.0.1:3002}"

check() {
  path="$1"
  code="$(curl -k -s -o /tmp/shoponline-smoke-body -w '%{http_code}' "$BASE_URL$path")"
  if [ "$code" -lt 200 ] || [ "$code" -ge 400 ]; then
    echo "FAIL $path HTTP $code"
    cat /tmp/shoponline-smoke-body
    exit 1
  fi
  echo "OK $path HTTP $code"
}

check "/api/health"
check "/"
check "/products"
check "/cart"
check "/checkout"
check "/tracking"
check "/admin/login"

echo "ShopOnline smoke passed for $BASE_URL"
