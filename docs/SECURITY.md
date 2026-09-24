# SECURITY — controls, threats, verification

All claims below are backed by real command output captured during the engagement (see `docs/EVIDENCE.md`).

## Application
| Control | Threat | Verified |
|---|---|---|
| bcrypt (cost 10) password hashing (upgraded to bcrypt 6) | credential theft | register/login work; prod audit 0 high/critical |
| JWT HS256 with explicit `algorithms` + httpOnly/SameSite=Strict cookie | token forgery/XSS | login/logout tested; old token 401 after rotation |
| Zod validation on auth, cart, product write, **and catalog filters** | injection/abuse | `/filter/price/abc` -> 400 |
| `requireRole('admin')` on product creation | privilege escalation | anonymous write -> 403 |
| helmet, CORS locked to `FRONTEND_ORIGIN`, 2-tier rate limiting | common web abuse | headers + 429 observed |
| Centralized error handler (no stack traces to client) | info disclosure | 500s return generic JSON |
| `trust proxy = 1` behind Traefik | rate-limit evasion / wrong IP | X-Forwarded handling fixed |
| Cookie `secure` only when public origin is HTTPS | auth unusable over HTTP | login works on the HTTP homelab |
| `/ready` gated on MongoDB + fail-fast `bufferCommands=false` | serving errors as healthy | readiness verified |

## Container / Kubernetes
- Non-root numeric UID 1001 (backends) / 101 (nginx), `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, `capabilities.drop:[ALL]`, `seccompProfile: RuntimeDefault`.
- Removed `npm`/`corepack` from runtime images; `apk upgrade`; images built from digest-pinned Node dependencies. Trivy HIGH/CRITICAL = 0 on all four.
- HPA min 1 / max 3; PDB `maxUnavailable: 1`; liveness `/health`, readiness `/ready`.

## Supply chain
- Jenkins: gitleaks (config fixed from no-op), tests, prod dependency audit, Trivy, Syft SBOM, cosign **sign by digest**, in-pipeline `cosign verify`, then digest pinning into Git.
- Private Harbor with project-scoped robots (pull-only for the cluster, push for CI).
- Kyverno admission policies scoped to `eshtry-mny`: no `:latest`, non-root, read-only rootfs, resource limits (Enforce); `verify-images` (**Audit** — Enforce blocked by Kyverno's private-realm SSRF guard, see `docs/08-policy-as-code.md`).

## Platform / delivery
- Local Kubernetes Secrets created out-of-band (`ci/scripts/create-secrets.sh`), never in Git; rotation demonstrated.
- Argo CD is the deployer (auto-sync, self-heal proven); manual `helm upgrade` retired.
- NetworkPolicies enforced (proven); broad `0.0.0.0/0` Mongo egress removed.

## Explicitly out of scope (honest)
- No TLS (HTTP-only LAN) — cookie `secure` disabled accordingly.
- Falco runtime detection not installed (not approved).
- ZAP DAST not run (documented waiver).
- App-level metrics **are** collected (prom-client `/metrics` + ServiceMonitor + Grafana dashboard "Eshtry-Mny" + PrometheusRule alerts).
