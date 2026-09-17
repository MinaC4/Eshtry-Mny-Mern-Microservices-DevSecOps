# 05 — Supply Chain: SBOM, Signing, Verification

## SBOM
Every image built by Jenkins gets a CycloneDX JSON SBOM from Syft, archived as a build artifact (`security/sbom/<svc>.cdx.json`). Also generated offline during this engagement (user ~908, frontend ~1305 components).

## Signing
- Key-based cosign (no public OIDC/Rekor on the homelab), private key kept outside Git at `~/.config/eshtry-mny/cosign.key`; public key committed at `security/cosign.pub`.
- Jenkins credentials: `cosign-key` (secret text) and `cosign-password`.
- **Always by digest**: the pipeline resolves the pushed digest via `docker inspect` and signs `repo@sha256:...` with `--tlog-upload=false --allow-insecure-registry`.

## Verification
- In-pipeline `cosign verify` immediately after signing (proof captured in build #12 console).
- Local re-verification of the deployed digest:
```
repo@sha256:c0f4d436...  ->  "The signatures were verified against the specified public key"
```

## Image CVE remediation performed in this phase
- `bcrypt` 5 -> 6: removes `@mapbox/node-pre-gyp`/`tar` (1 critical + 2 high) from the runtime dependency tree.
- `npm audit fix` across all four services; production audits now **0** high/critical (frontend 2 moderate).
- Runtime Dockerfiles: `apk upgrade` + removed bundled `npm`/`corepack` (eliminated ~20 npm-internal CVEs) ; frontend `apk upgrade`.
- Result: Trivy `HIGH,CRITICAL` on all four images = **0** (verified locally and in Jenkins build #12).

## Admission verification (next)
A Kyverno `verify-images` policy scoped to `eshtry-mny` (Audit -> Enforce) is the remaining Phase 5/8 deliverable: it will reject unsigned images using `security/cosign.pub`, alongside the four existing chart policies.
