#!/usr/bin/env bash
# Sign every application image BY DIGEST with cosign (key-based).
# Usage: REGISTRY=... TAG=... COSIGN_KEY=/path/cosign.key ./ci/scripts/sign.sh
set -euo pipefail

REGISTRY="${REGISTRY:-192.168.1.8:30082/eshtry-mny}"
TAG="${TAG:?set TAG to the image tag to sign}"
KEY="${COSIGN_KEY:?set COSIGN_KEY to the cosign private key path}"
SERVICES="${SERVICES:-user product cart frontend}"

for s in $SERVICES; do
  repo="$REGISTRY/eshtry-mny-$s"
  digest="$(docker inspect --format '{{index .RepoDigests 0}}' "$repo:$TAG" | cut -d@ -f2)"
  cosign sign --yes --key "$KEY" --tlog-upload=false --allow-insecure-registry "$repo@$digest"
  echo "signed: $repo@$digest"
done
