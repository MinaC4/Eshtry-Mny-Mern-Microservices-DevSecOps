# STATE — Eshtry-Mny Homelab DevSecOps Engagement

Last updated: after Phases 4 + 5(signing). Branch `devsecops/homelab-engagement`. Jenkins build **#12 SUCCESS**.

## Current position
- Phases **0–4 DONE**. Phase 5 **partial** (SBOM + cosign done; Kyverno `verify-images` pending). Phase 7 GitOps **DONE**.
- Full tool-driven flow proven: **Jenkins** (build → tests → audit → Trivy → SBOM → Harbor push → cosign sign+verify → digest pin) → **Git commit `1f64f3a`** → **Argo CD** deploys digest-pinned, signed images.
- App verified end-to-end (products 26, register 201, login 200, cart total 34.99, checkout).
- `kubectl` context `default`, k3s `v1.36.2+k3s1`.

## Cluster objects (namespace `eshtry-mny` + scoped ClusterPolicies)
Deployments user/product/cart/frontend; StatefulSet `mongodb` (+2Gi local-path PVC); Services (5); Ingress (class `traefik`, host `eshtry-mny.192.168.1.8.nip.io`); NetworkPolicies (default-deny + 4 allow + mongodb-allow); HPAs ×4 (min1/max3); PDBs ×4; ConfigMap `app-config`; out-of-band Secrets `app-secrets`, `harbor-creds`; ClusterPolicies `deny-latest-tag`, `require-non-root`, `require-readonly-rootfs`, `require-resource-limits` (all `namespaces: [eshtry-mny]`).
Argo CD Application `eshtry-mny` in `argocd` (auto-sync, prune, selfHeal; currently tracks the branch).
Harbor project `eshtry-mny` + robots `…puller` (pull) and `…ci` (push+pull).
Jenkins job `eshtry-mny`; credentials `harbor-ci`, `cosign-key`, `cosign-password`, `github-token`.

## Secrets / cosign (outside Git)
- `values-secret.yaml` (git-ignored) + `ci/scripts/create-secrets.sh`.
- cosign keypair `~/.config/eshtry-mny/cosign.{key,pub}` (private out of Git); public key committed `security/cosign.pub`.

## Locked decisions (operator)
GitHub source control (Gitea excluded) · in-cluster MongoDB (no Atlas) · local k8s Secrets (Vault/ESO broken, untouched) · Harbor registry · use operator's installed tools · merge to `main` at the end.

## Next exact steps
1. **Kyverno verify-images**: currently **Audit** — Enforce is blocked by a private-realm SSRF guard in Kyverno 1.18.2 (see docs/08-policy-as-code.md). Needs operator approval for one of: Harbor hostname realm + node registries.yaml, or a Kyverno upgrade. CI cosign verify remains the enforced control.
2. Phase 6 (secrets rotation evidence), Phase 9 (network/runtime proof), Phase 10 (smoke/DAST/observability), Phase 11 (README/SECURITY/EVIDENCE/COMPARISON/DEMO).
3. Merge branch → `main`; retarget Argo Application to `main`; update Jenkins job branch.

## Auth UX (fixed)
`POST /api/v1/users/logout` clears the cookie (verified: profile 401 after logout). `/login` and `/register` redirect authenticated users to `/`. NavBar shows Login/Logout.

## Open operator items
- SonarQube server pod is down (start it; then run Jenkins with `SONAR_ENABLED=true`).
- Branch protection (CR-1) needs repo admin.
- Falco (not installed), ZAP permission, Kaniko/rootless BuildKit — pending decisions.

## Key findings so far
- `.gitleaks.toml` was a no-op → fixed + proven. Non-numeric `USER` breaks `runAsNonRoot` → uid 1001. lockfiles pinned to a dead internal registry → fixed. Chart Kyverno policies were cluster-wide → scoped. JSON duplicate: MongoDB absent → deployed dedicated. Trivy HIGH/CRITICAL now 0 on all images.
