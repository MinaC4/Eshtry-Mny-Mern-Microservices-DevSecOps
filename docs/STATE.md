# STATE — Eshtry-Mny Homelab DevSecOps Engagement

Last updated: mid-Phase 4/5. App deployed via Argo CD (`Synced/Healthy`). Branch `devsecops/homelab-engagement`.

## Current position
- Phases 0–3 **DONE**. Phase 5 partially done (SBOM + cosign sign/verify proven; verify-images Kyverno policy NOT yet added).
- Phase 7 GitOps **working**: Argo CD Application `eshtry-mny` auto-syncs, self-heal proven.
- Phase 4 Jenkins: **BLOCKED on operator** (need Jenkins login/API token to create the additive job + credentials). Jenkins reachable at http://192.168.1.8:30081; GitHub+Harbor egress OK.
- SonarQube: only `sonar-postgres` running; app pod down (operator to start it).

## Deployer of record
Argo CD (do NOT run `helm upgrade` anymore). Secrets are out-of-band via `ci/scripts/create-secrets.sh`.
Cluster Application temporarily tracks the branch; committed `argocd-application.yaml` tracks `main`.

## Ready for Jenkins (prepared)
- `ci/scripts/{sbom.sh,sign.sh,verify.sh,create-secrets.sh}`
- Harbor CI robot `robot$eshtry-mny+eshtry-mny-ci` (push+pull); secret in `/tmp/opencode/harbor-ci-robot.json`
- cosign keypair at `~/.config/eshtry-mny/` (public key committed)
- Jenkinsfile NOT yet extended (next step once access is available)

## Next exact steps
1. Operator provides Jenkins credentials/token -> create additive pipeline job + credentials.
2. Extend Jenkinsfile: Harbor registry, optional SonarQube, SBOM/sign/verify, digest-pinned values bump.
3. Add Kyverno `verify-images` (namespaced to eshtry-mny), Audit -> Enforce, prove unsigned rejection.
4. Phases 8–11.


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
