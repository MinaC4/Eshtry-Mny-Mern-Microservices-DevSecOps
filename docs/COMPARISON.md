# COMPARISON — repo as received vs as delivered

## Already good (kept, not rewritten)
- Real security thinking: helmet, strict CORS, two-tier rate limiting, centralized error handling, Zod validation on auth/cart/product, RBAC, bcrypt, JWT with explicit `algorithms`.
- Multi-stage Dockerfiles with non-root users; k8s hardening (runAsNonRoot, readOnlyRootFilesystem, capabilities, probes, resources, PDBs, HPAs, anti-affinity).
- Default-deny NetworkPolicy with correct DNS egress; Trivy + gitleaks + tests + audit stages in Jenkins; Argo CD Application.

## Wrong for this environment (fixed)
| As received | Problem | Fix |
|---|---|---|
| `ingress.className: nginx` + netpol `ingress-nginx` | cluster runs **Traefik** in `kube-system` -> zero traffic | class `traefik`; netpol `kube-system`+traefik pod selector |
| AWS Secrets Manager ClusterSecretStore + IRSA | no AWS -> pods crash-loop | gated off; local out-of-band Secret |
| MongoDB Atlas `mongodb+srv://` + `0.0.0.0/0:27017` egress | no Atlas; broad exfil path | dedicated in-cluster MongoDB; egress to Mongo pods only |
| `replicaCount: 3`, HPA min 3 ×4 | 12+ pods on memory-tight nodes | min 1 / max 3; PDB maxUnavailable |
| Kyverno policies cluster-wide | could reject other projects | scoped to `eshtry-mny` |
| Docker Hub images + mutable tags | no signing/digests | Harbor + cosign sign-by-digest + digest pinning |
| Host-Docker Jenkins `agent any` | — | kept (documented tradeoff); tools run via containers |

## Genuinely missing (added)
- SBOM (Syft), image signing + verification (cosign), digest pinning + Kyverno `verify-images`.
- `.gitleaks.toml` was a **no-op** (all rules disabled) -> fixed and proven.
- Non-numeric `USER` (image would not start under `runAsNonRoot`) -> numeric UID.
- `package-lock.json` pinned to a dead internal registry -> npmjs.
- Cart had no remove control; checkout had no receipt/summary; profile had broken image paths and a dead button -> fixed.
- No logout; `/login` didn't redirect authenticated users -> fixed.
- No smoke test -> Argo PostSync Job.

## Honest limitations
HTTP-only (no TLS), local Secrets instead of Vault/ESO (the operator's ESO↔Vault wiring is broken), Kyverno `verify-images` in Audit (private-realm guard), Falco not installed, ZAP not run, no app-level Prometheus metrics.
