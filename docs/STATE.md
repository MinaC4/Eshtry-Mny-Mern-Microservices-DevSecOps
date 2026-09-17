# STATE — Eshtry-Mny Homelab DevSecOps Engagement

Last updated: end of Phase 2. No cluster writes performed. Working branch `devsecops/homelab-engagement`.

## Current position
- Phases 0, 1, 2: **DONE** (Phase 2 left one BLOCKED item: branch protection needs repo admin — CR-1).
- Next: Phase 3 (first cluster writes) — prerequisite fixes identified (ingress class, netpol ns, secrets->local, in-cluster Mongo, HPA 1/3, Kyverno namespace scoping, numeric uid).
- Resume: read this file, then `docs/01-ADR-0001-homelab-adaptation.md` and the phase reports.

## Locked decisions (operator)
- Source control: **GitHub** (origin), Gitea excluded. Work on branches, merge when verified.
- Database: **in-cluster MongoDB** (dedicated, inside `eshtry-mny`); Atlas rejected.
- Secrets: **local Kubernetes Secret** (Vault/ESO broken + inmem; not touched).
- Registry: **Harbor** project `eshtry-mny` @ `192.168.1.8:30082` (pending project creation).
- Platform: use operator's installed tools (Jenkins, Harbor, Argo CD, Kyverno, Prometheus).
- Everything runs for real; report per phase; no breaking other projects.

## Preflight
- context `default`, `v1.36.2+k3s1`; nodes mina(8c/14.8Gi), worker-1(4c/5.6Gi), worker-2(3c/3.7Gi); `mina` 80% mem.

## Key discovered facts
- Ingress = Traefik (default) in `kube-system`; NO ingress-nginx.
- Kyverno 1.18.2 (16 policies), ESO 2.9.0 (Vault store broken), Argo CD, Jenkins, Harbor, Prometheus present. No Falco/Loki.
- `eshtry-mny` namespace does NOT exist. No MongoDB anywhere. No `eshtry-mny` Harbor project.
- Chart gaps confirmed: AWS store, ingress-nginx x4, 12-pod min, no digest/sign/SBOM, host-Docker Jenkins, cluster-wide Kyverno policies.
- Tools local: kubectl, helm v3.14, git, docker, cosign, grype, trivy, jq, yq, node. Missing: syft, gitleaks, hadolint, mongosh.

## Names created so far
- Git branch `devsecops/homelab-engagement`.
- No cluster objects.

## Phase 2 outcomes / carry-forward
- `.gitleaks.toml` was a no-op (missing `[extend] useDefault = true`) — **fixed and proven** with a planted GitHub PAT.
- pre-commit installed and green; branch protection BLOCKED (no repo admin) -> CR-1.
- Phase 3 must address numeric uid: backends use `USER appuser` (non-numeric) + chart `runAsNonRoot: true` -> kubelet rejects ("cannot verify user is non-root"). Pin uid and set `runAsUser`.

## Open decisions needed (for later phases)
1. Falco in scope? 2. ZAP permitted? 3. BuildKit/Kaniko? 4. Harbor project creation approved? 5. Merge policy (per phase vs final).

## Exit criteria for the engagement (unchanged)
Real end-to-end: build -> scan -> SBOM -> sign -> push -> GitOps sync -> admission verify -> running app -> full user journey -> runtime/network proof -> docs/evidence.
