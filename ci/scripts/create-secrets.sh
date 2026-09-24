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

# Per-service MongoDB least-privilege credentials (E-02). Each service gets its own
# account (see ci/scripts/create-mongo-users.sh for the roles).
dbn=$(yq -r '.mongoDbname' eshtry-mny/values.yaml)
uu=$(yq -r '.secrets.mongoSvcUser.username' "$VALUES");    up=$(yq -r '.secrets.mongoSvcUser.password' "$VALUES")
pu=$(yq -r '.secrets.mongoSvcProduct.username' "$VALUES"); pp=$(yq -r '.secrets.mongoSvcProduct.password' "$VALUES")
cu=$(yq -r '.secrets.mongoSvcCart.username' "$VALUES");    cp=$(yq -r '.secrets.mongoSvcCart.password' "$VALUES")
uri_user="mongodb://$uu:$up@mongodb:27017/$dbn?authSource=eshtry_mny"
uri_product="mongodb://$pu:$pp@mongodb:27017/$dbn?authSource=eshtry_mny"
uri_cart="mongodb://$cu:$cp@mongodb:27017/$dbn?authSource=eshtry_mny"

kubectl create secret generic app-secrets -n "$NS" \
  --from-literal=MONGO_USERNAME="$u" \
  --from-literal=MONGO_PASSWORD="$p" \
  --from-literal=MONGO_URI="$uri" \
  --from-literal=MONGO_URI_USER="$uri_user" \
  --from-literal=MONGO_URI_PRODUCT="$uri_product" \
  --from-literal=MONGO_URI_CART="$uri_cart" \
  --from-literal=ACCESS_TOKEN="$tok" \
  --from-literal=INTERNAL_TOKEN="$it" \
  --dry-run=client -o yaml | kubectl apply -f -

# JWT signing keys (RS256): private key only reaches user-service, public key
# reaches product/cart. Kept in a separate Secret so envFrom(app-secrets) never
# leaks the private key to every service.
JWT_PRIV_FILE="${JWT_PRIV_FILE:-$HOME/.config/eshtry-mny/jwt.key}"
JWT_PUB_FILE="${JWT_PUB_FILE:-$HOME/.config/eshtry-mny/jwt.pub}"
if [ -f "$JWT_PRIV_FILE" ] && [ -f "$JWT_PUB_FILE" ]; then
  kubectl create secret generic jwt-keys -n "$NS" \
    --from-file=JWT_PRIVATE_KEY="$JWT_PRIV_FILE" \
    --from-file=JWT_PUBLIC_KEY="$JWT_PUB_FILE" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

kubectl create secret docker-registry harbor-creds -n "$NS" \
  --docker-server="$reg" \
  --docker-username="$hu" \
  --docker-password="$hp" \
  --dry-run=client -o yaml | kubectl apply -f -

# The PostSync smoke test runs in its own namespace and authenticates with the
# internal token so it is not throttled by the app rate limiters.
if kubectl get ns eshtry-mny-tests >/dev/null 2>&1; then
  kubectl create secret generic internal-token -n eshtry-mny-tests \
    --from-literal=INTERNAL_TOKEN="$it" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

echo "secrets app-secrets + harbor-creds applied in $NS"
