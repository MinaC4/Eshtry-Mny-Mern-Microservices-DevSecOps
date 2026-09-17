# 01 — Infrastructure Inventory (read-only discovery)

Collected with the operator's kubeconfig, context `default`, on the live cluster. No write operations were performed except the sanctioned egress/network test later referenced (Phase 9, not yet run).

## Cluster

| Item | Value |
|---|---|
| Context | `default` (matches intended) |
| Server | `v1.36.2+k3s1` (k3s, containerd `2.3.2-k3s2`) |
| Nodes | `mina` (control-plane, 192.168.1.8, 8 CPU / 15.2Gi alloc), `worker-1` (10.1.211.122, 4 CPU / 5.6Gi), `worker-2` (10.1.211.202, 3 CPU / 3.7Gi) |
| StorageClass | `local-path` (default) |
| Running pods (all ns) | 110 |

## Ingress reality (resolves gap 2.7.2)

- IngressClass: **`traefik` (default)** — `traefik.io/ingress-controller`.
- Controller pod: `kube-system/traefik-5ffff6468-6psx6`, labels `app.kubernetes.io/name=traefik`, `app.kubernetes.io/instance=traefik-kube-system`.
- **There is NO `ingress-nginx` namespace and no ingress-nginx install** (`NotFound`). The chart's `className: nginx` and all four NetworkPolicy `namespaceSelector: ingress-nginx` are therefore wrong for this cluster. Fix = class `traefik` + `from: namespaceSelector kube-system AND podSelector app.kubernetes.io/name=traefik`.

## Platform components already present (do not modify)

| Component | Namespace | Version | Relevance |
|---|---|---|---|
| Jenkins | `jenkins` | chart 5.9.45 / Jenkins 2.568.1 | CI (operator's tool of choice) |
| Harbor | `harbor` | 2.15.1 | registry; `EXT_ENDPOINT=http://harbor.192.168.1.8.nip.io`, NodePort core `30082` |
| Gitea | `gitea` | 1.27.0 | **EXCLUDED by operator** — source control stays GitHub |
| Vault | `vault` | 2.0.3 | present, **sealed=false**, but **storage=inmem** |
| External Secrets | `external-secrets` | v2.9.0 | installed, but `SecretStore/vault` = `InvalidProviderConfig` |
| Kyverno | `kyverno` | v1.18.2 | installed; 16 ClusterPolicies exist cluster-wide |
| Argo CD | `argocd` | deployed | GitOps; existing apps: `boutique-dev/prod/staging`, `hephastos-dashboard` |
| kube-prometheus-stack | `monitoring` | 87.19.1 | Prometheus/Grafana |
| trivy-operator | `trivy-system` | 0.36.0 | image scanning |
| Velero / MinIO / SonarQube / Devtron / Backstage | various | — | not used by this engagement |
| **Falco** | — | **not installed** | runtime security: requires operator approval |
| **Loki** | — | **not installed** | no log aggregation |

## Kyverno existing ClusterPolicies (all `validationFailureAction: Enforce` unless noted)

`add-default-resources`, `block-host-access`, `block-privileged-containers`, `drop-all-linux-capabilities`, `require-image-tag`, `require-non-root-user`, `require-read-only-root-filesystem`, `require-namespace-label` (Audit), plus `boutique-*` (10; `boutique-verify-images` = Audit).
**No name collision** with the chart's four (`deny-latest-tag`, `require-non-root`, `require-readonly-rootfs`, `require-resource-limits`).
**Blast-radius warning:** those four chart policies match all namespaces. Installing as-is would impose readOnlyRootFilesystem/resource-limits on every workload in the cluster. Mitigation in ADR-0001 (scope to `eshtry-mny`).

## Secrets backend reality (resolves gap 2.7.1)

- Vault is up and unsealed, but **`storage Type: inmem`** (non-persistent) and its `SecretStore/vault` (`external-secrets` ns) is `InvalidProviderConfig` / `Ready=False` ("unable to create client", tokenSecretRef `vault-token`).
- ESO is installed but the Vault wiring is broken cluster-wide (also `boutique-vault` = InvalidProviderConfig).
- **Decision:** do NOT fix or alter the operator's Vault/ESO. Use a **locally-managed Kubernetes Secret** (`app-secrets`) for `eshtry-mny`, documented as the deliberate homelab tradeoff. The AWS `ClusterSecretStore`/`ExternalSecret` templates are gated off (not left half-wired).

## Git / CI reality (resolves 2.7.6, 2.7.12)

- Origin: `https://github.com/MinaC4/Eshtry-Mny-Mern-Microservices-DevSecOps.git` (**public**). GitHub CLI authenticated as `Hephast0s`.
- `git push --dry-run origin main` succeeds; working branch `devsecops/homelab-engagement` created.
- Jenkins pod `jenkins-0` containers: `jenkins`, `iframe-proxy` (nginx), `config-reload` — **no Docker-in-Docker sidecar**; the pipeline's `docker` commands imply a host Docker socket/daemon. Confirmed as host-Docker model (accepted tradeoff, see ADR).
- Existing Jenkinsfile already auto-pushes tag bumps to `main` (single-repo GitOps).

## Registry reality

- Harbor reachable at `http://192.168.1.8:30082` and `http://harbor.192.168.1.8.nip.io`; API `/api/v2.0/projects` returns 200.
- Existing projects: `apps`, `boutique`, `hephastos`, `library`. **No `eshtry-mny` project yet**.
- Local Docker has an existing auth entry for `192.168.1.8:30082`.
- **Decision:** migrate off Docker Hub (`minac4`) to Harbor project `eshtry-mny` (operator's tool; Gitea is the only excluded tool).

## NetworkPolicy enforcement

- k3s uses containerd + k3s embedded networking; no Calico/Cilium; no standalone netpol controller pod (k3s embeds one). Enforcement is **plausible but unproven**.
- Plan: empirical allow/deny test in a disposable namespace in Phase 9; until then, treat default-deny as unverified.

## Unified mismatch list (chart vs cluster)

| # | Chart assumption | Cluster reality | Action |
|---|---|---|---|
| 1 | `ingress.className: nginx` | `traefik` | change to `traefik` |
| 2 | netpol `from: ingress-nginx` (x4) | Traefik in `kube-system` | change to ns+pod selector |
| 3 | `ClusterSecretStore` AWS | no AWS; ESO/Vault broken | gate off; local Secret |
| 4 | `mongodb+srv` (Atlas) | no Mongo anywhere | in-cluster Mongo + `MONGO_URI` |
| 5 | `replicaCount 3`, HPA min 3 | memory-tight nodes | min 1 / max 3 |
| 6 | Kyverno policies cluster-wide | affects other projects | scope to `eshtry-mny` |
| 7 | `eshtry-mny.local` host | no DNS | `eshtry-mny.192.168.1.8.nip.io` |
| 8 | Docker Hub images | Harbor available | Harbor `eshtry-mny` project |
| 9 | `frontendOrigin` HTTPS placeholder | HTTP LAN | `http://eshtry-mny.192.168.1.8.nip.io` |
