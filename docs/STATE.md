# STATE — Eshtry-Mny Homelab DevSecOps Engagement

Last updated: end of Phase 3. Release `eshtry-mny` deployed in namespace `eshtry-mny` (revision 4).

## Current position
- Phases 0, 1, 2, 3: **DONE**. Phase 2 has one BLOCKED item (branch protection, CR-1).
- Phase 3: 5/5 workloads Running, full user journey verified. Images on Harbor `eshtry-mny` (tags `0.1.0-homelab*`).
- Next: Phase 4 (Jenkins hardening + SBOM/sign in-pipeline), then Phase 5 (cosign + verify-images).
- Resume: read this file, then `docs/03-baseline-deployment.md`, `docs/01-ADR-0001-homelab-adaptation.md`.

## Cluster objects now existing (all in `eshtry-mny` + 4 scoped ClusterPolicies)
Deployments user/product/cart/frontend, StatefulSet mongodb (+2Gi PVC), 5 Services, Ingress (traefik), 6 NetworkPolicies, 4 HPAs (min1/max3), 4 PDBs, ConfigMap app-config, Secrets app-secrets + harbor-creds, ClusterPolicies deny-latest-tag/require-non-root/require-readonly-rootfs/require-resource-limits.
Harbor project `eshtry-mny` + robot `robot$eshtry-mny+eshtry-mny-puller`.
Local untracked file `values-secret.yaml` holds the secrets.

## Access
- App: `http://eshtry-mny.192.168.1.8.nip.io`
- Mongo creds live only in `values-secret.yaml` + Secret `app-secrets`.

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
