#!/usr/bin/env bash
# Verify the cosign signature of every application image BY DIGEST.
# Usage: REGISTRY=... TAG=... COSIGN_PUB=security/cosign.pub ./ci/scripts/verify.sh
set -euo pipefail

REGISTRY="${REGISTRY:-192.168.1.8:30082/eshtry-mny}"
TAG="${TAG:?set TAG to the image tag to verify}"
PUB="${COSIGN_PUB:-security/cosign.pub}"
SERVICES="${SERVICES:-user product cart frontend}"

fail=0
for s in $SERVICES; do
  repo="$REGISTRY/eshtry-mny-$s"
  digest="$(docker inspect --format '{{index .RepoDigests 0}}' "$repo:$TAG" | cut -d@ -f2)"
  if cosign verify --key "$PUB" --insecure-ignore-tlog --allow-insecure-registry "$repo@$digest" >/dev/null 2>&1; then
    echo "verified: $repo@$digest"
  else
    echo "FAILED: $repo@$digest"
    fail=1
  fi
done
exit "$fail"
