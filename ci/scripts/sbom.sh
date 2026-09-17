#!/usr/bin/env bash
# Generate a CycloneDX SBOM for every application image.
# Usage: REGISTRY=... TAG=... ./ci/scripts/sbom.sh
set -euo pipefail

REGISTRY="${REGISTRY:-192.168.1.8:30082/eshtry-mny}"
TAG="${TAG:?set TAG to the image tag to scan}"
OUT="${OUT:-security/sbom}"
SERVICES="${SERVICES:-user product cart frontend}"

mkdir -p "$OUT"
for s in $SERVICES; do
  img="$REGISTRY/eshtry-mny-$s:$TAG"
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    anchore/syft:latest "docker:$img" -o cyclonedx-json > "$OUT/$s.cdx.json"
  echo "sbom: $OUT/$s.cdx.json ($(jq '.components | length' "$OUT/$s.cdx.json") components)"
done
