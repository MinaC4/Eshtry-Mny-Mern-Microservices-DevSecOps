#!/usr/bin/env bash
# Smoke test used by the Argo CD PostSync hook (see eshtry-mny/templates/smoke-test.yaml).
# Walks the real user journey through the Ingress. Run from inside the cluster.
set -e
BASE="${BASE:-http://eshtry-mny.192.168.1.8.nip.io}"
CURL="curl -fsS --retry 5 --retry-delay 5 --retry-all-errors"

echo "GET / -> $($CURL -o /dev/null -w '%{http_code}' "$BASE/")"
test "$($CURL -o /dev/null -w '%{http_code}' "$BASE/api/v1/products")" = "200"
test "$($CURL "$BASE/api/v1/products" | grep -o '"name"' | wc -l)" -ge 1

EMAIL="smoke-$(date +%s)@example.com"
$CURL -o /dev/null -X POST "$BASE/api/v1/users" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Password123\",\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"age\":25,\"phone\":\"01000000001\",\"gender\":\"\"}"
$CURL -c /tmp/cj -o /dev/null -X POST "$BASE/api/v1/users/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Password123\"}"
PID=$($CURL "$BASE/api/v1/products" | tr ',' '\n' | grep -m1 '_id' | sed 's/.*"\([a-f0-9]\{24\}\)".*/\1/')
$CURL -b /tmp/cj -o /dev/null -X POST "$BASE/api/v1/cart/$PID"
$CURL -b /tmp/cj -X DELETE "$BASE/api/v1/cart/checkout" | grep -q "Checkout completed"
echo "SMOKE OK"
