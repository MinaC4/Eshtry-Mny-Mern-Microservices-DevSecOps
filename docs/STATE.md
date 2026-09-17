# STATE — Eshtry-Mny Homelab DevSecOps Engagement

Last updated: Phases 9/10/11 + functional/UI work. Branch `devsecops/homelab-engagement`. Jenkins build #15 SUCCESS; smoke Job `SMOKE OK`.

## Current position
- Phases **0–11 substantially DONE**. Remaining: **merge to `main`** (operator said at the end), and three documented gaps that need decisions (Kyverno Enforce, ZAP DAST, app `/metrics`).
- Everything runs on its own tools: Jenkins (build→scan→SBOM→sign→pin) → Git → Argo CD (deploy + self-heal + PostSync smoke) → Harbor. 5/5 pods, Argo `Synced/Healthy`.
- Secret rotation proven (old token 401, re-login 200); **rotate then roll all three backends** (the smoke test caught cross-service 401 from stale pods).
- NetworkPolicy enforcement proven (allowed/denied matrix in `docs/09-network-security.md`).
- UI/functional fixes: cart remove, checkout summary + receipt, full profile page, logout, auth redirects, add-to-cart errors, image fallback.

## Docs
`docs/00-*` analysis/threat/build, `01-*` infra/capacity/ADR, phase reports `docs/phases/`, `SECURITY.md`, `EVIDENCE.md`, `COMPARISON.md`, `DEMO.md`, `08-policy-as-code.md`, `09-network-security.md`, `10-dynamic-testing.md`, `FUNCTIONAL-REVIEW.md`, `CHANGE_LOG.md`, `ROLLBACK.md`, `ISSUES.md`.

## Blocked / decisions
1. Kyverno `verify-images` Enforce blocked by private-realm SSRF guard (Audit now). Options: Harbor hostname + node registries.yaml, or Kyverno upgrade.
2. Branch protection (CR-1, needs repo admin).
3. SonarQube server pod down (deferred).
4. Falco not installed (deferred).
5. ZAP baseline blocked by image pull failure (ghcr.io connection reset).

## Observability (DONE)
Backends expose `/metrics` (prom-client); ServiceMonitor + `allow-prometheus` NetworkPolicy; Prometheus 3/3 targets up; Grafana dashboard `Eshtry-Mny` (5 panels) loaded.

## Merge plan
Merge `devsecops/homelab-engagement` → `main`; retarget the Argo Application `targetRevision` to `main`; update the Jenkins job branch. Committed `argocd-application.yaml` already targets `main`.


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
