# PHASE 8 REPORT — Admission Control (Kyverno)

Status: **PARTIAL** — 5 policies installed; `verify-images` on **Audit**, not Enforce.

- Chart policies scoped to `eshtry-mny` and Enforce: `deny-latest-tag`, `require-non-root`, `require-readonly-rootfs`, `require-resource-limits` (all Ready).
- New `eshtry-verify-images` (cosign public key) — **Audit**.
- **Unsigned rejection proven** while Enforce was temporarily on:
```
admission webhook "mutate.kyverno.svc-fail" denied the request:
eshtry-verify-images: verify-cosign-key: failed to verify image ...:0.1.0-homelab
```
- **Blocker**: signed images also fail verification with `invalid realm in www-authenticate: realm host "192.168.1.8" is a private or link-local address` (Kyverno 1.18.2 go-containerregistry SSRF guard vs private-IP Harbor). Enforce therefore breaks the app, so it was returned to Audit.
- Resolutions require operator approval (CR-3): Harbor hostname realm + node `registries.yaml`, or a Kyverno upgrade.
- Deliverable: `docs/08-policy-as-code.md`.
