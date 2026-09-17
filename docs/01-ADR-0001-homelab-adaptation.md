# ADR-0001 — Homelab Adaptation Decisions

Status: Accepted (Phase 1). Each of the six engagement gaps (Section 2.7) mapped to keep / adapt / replace, plus decisions forced by the real cluster.

## D1 — Secrets backend (gap 2.7.1, R21)
**Decision: REPLACE (ESO/AWS -> locally-managed Kubernetes Secret).**
- Evidence: no AWS account; cluster's ESO `SecretStore/vault` is `InvalidProviderConfig`; Vault storage is `inmem` (non-persistent) and the Vault auth wiring is broken cluster-wide.
- Chosen path: Helm renders an `app-secrets` Secret (`MONGO_USERNAME`, `MONGO_PASSWORD`, `ACCESS_TOKEN`) whose values come from a **git-ignored** `values-secret.yaml` / Jenkins credentials, never committed. AWS `ClusterSecretStore` + `ExternalSecret` templates are gated behind `externalSecrets.enabled=false` (kept for reference, not applied).
- Consequence: no external secret manager in the loop; rotation = update Secret + restart. Documented honestly; a Vault CHANGE_REQUEST is offered but not executed.

## D2 — Ingress controller (gap 2.7.2, R19)
**Decision: ADAPT (rewrite to the real controller).**
- Reality: Traefik (`ingressClass traefik`, ns `kube-system`, pod label `app.kubernetes.io/name=traefik`).
- Change: `values.yaml` `ingress.className: traefik`; host `eshtry-mny.192.168.1.8.nip.io`; all four NetworkPolicies' ingress `from` becomes `namespaceSelector kube-system` **plus** `podSelector app.kubernetes.io/name=traefik` (same list element = AND). Frontend-internal paths (`podSelector app: frontend`) remain.
- No ingress-nginx install (additive-only, avoid a second controller).

## D3 — NetworkPolicy enforcement (gap 2.7.3, R20)
**Decision: ADAPT (keep policies, prove enforcement).**
- k3s embeds a network-policy controller; no Calico/Cilium. Enforcement is unproven until the Phase 9 disposable-namespace test. If enforcement is confirmed off, that is reported as a false control and the mitigation options (enable controller / install a CNI) become an explicit CHANGE_REQUEST — not silently ignored.

## D4 — Replica/HPA sizing (gap 2.7.4, capacity)
**Decision: ADAPT.** minReplicas 3 -> **1**, maxReplicas 10 -> **3**, all four HPAs. PDB `minAvailable: 1` -> `maxUnavailable: 1` (single-replica safe). See `01-capacity-budget.md`.

## D5 — Supply chain (gap 2.7.5, R13/R14)
**Decision: EXTEND (new capability, nothing to remove).**
- Pin the four base images by digest in the Dockerfiles.
- SBOM (Syft, CycloneDX JSON) per image; cosign **key-based** signing **by digest**; `cosign verify` in-pipeline.
- New Kyverno `verify-images` policy, **namespaced/match-scoped to `eshtry-mny`**, rolled out Audit then Enforce.
- Private key stored as a Jenkins credential; public key at `security/cosign.pub`.

## D6 — Jenkins build model (gap 2.7.6, R15)
**Decision: KEEP AS-IS + document (accepted tradeoff).**
- Operator's Jenkins uses the host Docker daemon; migrating to Kaniko/rootless BuildKit is deferred and requires explicit approval. Mitigations: gitleaks gate, Harbor robot credentials (project-scoped), no secrets in logs, image signing so a compromised build cannot deploy unsigned.

## D7 — MongoDB strategy (gap 2.7.11, R9/R10/R11/R12)
**Decision: REPLACE Atlas -> dedicated in-cluster MongoDB (operator directive: "use the DB on the cluster").**
- Finding: **no MongoDB exists anywhere on the cluster**; the operator meant "not Atlas". A dedicated `mongodb` StatefulSet + `local-path` PVC is deployed inside `eshtry-mny`, so no other project is touched.
- App change (minimal, justified): `*/config/db_conn.js` gains `MONGO_URI` support with the existing `mongodb+srv://` composition as fallback (backward compatible). Nothing else in the app changes.
- NetworkPolicy egress `0.0.0.0/0:27017` -> `podSelector app: mongodb, port 27017` only. Mongo also gets an explicit allow-policy (DNS + 3 services) and no public Service.
- Seed `products.json` (26 docs) via a one-shot Job.

## D8 — Kyverno blast radius (NEW, R18)
**Decision: ADAPT.** The chart's four `ClusterPolicy` objects match all namespaces. Replace with namespace-scoped enforcement for `eshtry-mny` only (either `Policy` kinds or `match...namespaces: [eshtry-mny]`), so other projects are unaffected. The four `verify-images`/existing names remain non-colliding.

## D9 — Registry
**Decision: REPLACE Docker Hub -> Harbor** project `eshtry-mny` at `192.168.1.8:30082` (operator's tool; Gitea is the only excluded tool). Jenkins push credential becomes a Harbor robot account scoped to that project.

## D10 — Source control / GitOps
**Decision: KEEP single-repo GitOps on GitHub.** Gitea excluded by operator. Preserve the existing "Jenkins bumps image tags and pushes to `main`" promotion; add branch protection/required check and (optionally) a signed CI commit. Argo CD `Application` is reused and hardened, not replaced.
