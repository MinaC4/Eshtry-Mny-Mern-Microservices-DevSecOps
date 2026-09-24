#!/usr/bin/env bash
# Create the out-of-band Secrets the app expects (ADR D1). Kept OUT of the Helm
# chart so Argo CD never renders or prunes them. Idempotent.
# Usage: VALUES_SECRET=values-secret.yaml NAMESPACE=eshtry-mny ./ci/scripts/create-secrets.sh
set -euo pipefail

NS="${NAMESPACE:-eshtry-mny}"
VALUES="${VALUES_SECRET:-values-secret.yaml}"
[ -f "$VALUES" ] || { echo "missing $VALUES"; exit 1; }

u=$(yq -r '.secrets.mongoUsername' "$VALUES")
p=$(yq -r '.secrets.mongoPassword' "$VALUES")
uri=$(yq -r '.secrets.mongoUri' "$VALUES")
tok=$(yq -r '.secrets.accessToken' "$VALUES")
it=$(yq -r '.secrets.internalToken' "$VALUES")
hu=$(yq -r '.secrets.harborUsername' "$VALUES")
hp=$(yq -r '.secrets.harborPassword' "$VALUES")
reg=$(yq -r '.registry.host // ""' "$VALUES")
if [ -z "$reg" ] || [ "$reg" = "null" ]; then
  reg=$(yq -r '.registry.host' eshtry-mny/values.yaml)
fi
reg="${reg:-192.168.1.8:30082}"

kubectl create secret generic app-secrets -n "$NS" \
  --from-literal=MONGO_USERNAME="$u" \
  --from-literal=MONGO_PASSWORD="$p" \
  --from-literal=MONGO_URI="$uri" \
  --from-literal=ACCESS_TOKEN="$tok" \
  --from-literal=INTERNAL_TOKEN="$it" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry harbor-creds -n "$NS" \
  --docker-server="$reg" \
  --docker-username="$hu" \
  --docker-password="$hp" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "secrets app-secrets + harbor-creds applied in $NS"
