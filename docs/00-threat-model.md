# 00 — Threat Model (STRIDE per trust boundary)

Scope: the app as deployed on the operator's k3s homelab. Trust boundaries:
- **TB1** Internet/LAN -> Traefik -> Ingress -> frontend
- **TB2** frontend pod -> user/product/cart Services (cluster-internal HTTP)
- **TB3** user/product/cart pods -> MongoDB
- **TB4** CI/CD (Jenkins, registry, Git) -> cluster (supply chain)
- **TB5** cluster platform -> workload (admission/network/runtime)

All risks are code-grounded (file:line in `00-application-analysis.md`).

## TB1 — Internet/LAN -> frontend

| ID | STRIDE | Risk | Control |
|---|---|---|---|
| R1 | Spoofing | Weak/default JWT secret lets attacker forge tokens. `ACCESS_TOKEN` is a plain env var; no strength check. | Secret injected from a locally-managed k8s Secret (never in Git); document minimum entropy; rotation in Phase 6. |
| R2 | Tampering | Ingress routes to both frontend and backends; no WAF/TLS. | HTTP-only accepted on LAN; Ingress restricted to one host; NetworkPolicy limits who may reach each service. |
| R3 | Info disclosure | Stack traces / internal errors leaked. | Existing centralized handler returns generic 500 (`User/server.js:53`). Verified present. |
| R4 | DoS | Brute-force login / flooding. | Existing 10/15min auth limiter and 100/15min global limiter; HPA + resource limits. |

## TB2 — frontend -> backends

| ID | STRIDE | Risk | Control |
|---|---|---|---|
| R5 | Info disclosure | `FRONTEND_ORIGIN` default `http://localhost:5173`; if not overridden the CORS/cookie policy is wrong for the real host. | Helm ConfigMap sets it to the real ingress host (Phase 3); `secure` cookie requires prod `NODE_ENV`. |
| R6 | Elevation | Client-controlled role: JWT carries `role`; if secret leaks, admin escalation. | `requireRole('admin')` on write routes (`Product/routes/productRouter.js:12`); short 1h expiry; signed HS256 only. |
| R7 | Tampering | `filterRouter` params unvalidated, unauthenticated: `/price/:price`, `/categoryprice/:category&&:price` feed `$lte`. | Add zod validation (`price` numeric, `category` bounded string) in Phase 3; no auth added (public catalog by design). |
| R8 | DoS | cart->product fan-out: a cart with N items makes N HTTP calls (`cartController.js:27`). | 3s timeout + 2 retries already; keep; note scaling risk. |

## TB3 — backends -> MongoDB

| ID | STRIDE | Risk | Control |
|---|---|---|---|
| R9 | Info disclosure | Broad egress `0.0.0.0/0:27017` in all 3 policies (`networkpolicy-user.yaml:40`) — only justified for Atlas, not in-cluster Mongo. | **Rewrite** egress to the in-cluster MongoDB pod selector only (Phase 3). Removes silent exfil path. |
| R10 | Spoofing | `mongodb+srv://` hard-coded (`*/config/db_conn.js:11`); no non-SRV fallback, no auth source. | Add `MONGO_URI` override + fallback; credentials from local Secret; Mongo auth enabled. |
| R11 | Tampering | Mongo has no auth/TLS by default if self-hosted naively. | In-cluster Mongo with username/password + `authSource=admin`, PVC, not exposed publicly. |
| R12 | Info disclosure | Mongo reachable cluster-wide (no NetworkPolicy for it). | Add default-deny already covers namespace; add explicit Mongo allow only from the 3 services. |

## TB4 — CI/CD supply chain

| ID | STRIDE | Risk | Control |
|---|---|---|---|
| R13 | Tampering | Mutable base tags (`node:20-alpine`) and build-number-only image tags; no digest pinning. | Pin base images by digest in the 4 Dockerfiles; sign images by digest (Phase 5). |
| R14 | Spoofing | No image signing / no admission verification of image identity. | cosign keypair; `verify-images` Kyverno policy scoped to `eshtry-mny` (Phase 5/8). |
| R15 | Tampering | Jenkins host Docker daemon = RCE blast radius if pipeline is compromised. | **Accepted tradeoff** documented; mitigations: gitleaks, least-privilege credentials, no secrets in logs. Kaniko deferred unless approved. |
| R16 | Elevation | `git push origin HEAD:main` from Jenkins auto-promotes to deploy with no review. | Branch protection + required check (Phase 2); signed CI commit; Argo CD verifies only signed images. |
| R17 | Info disclosure | Registry credentials in pipeline. | `DOCKERHUB_CREDENTIALS` -> replaced by a Harbor robot account scoped to the project; masked in logs. |

## TB5 — cluster platform -> workload

| ID | STRIDE | Risk | Control |
|---|---|---|---|
| R18 | Elevation | Chart's 4 `ClusterPolicy` objects match all namespaces; installing them as-is could reject *other* projects' pods and is an unintended cluster-wide blast radius. | Rewrite to namespaced `Policy` (or namespace-scoped match) limited to `eshtry-mny` (Phase 3/8). |
| R19 | Elevation | Ingress controller = Traefik in `kube-system`, but policies allow only `ingress-nginx` (namespace absent). Result: either zero traffic (control broken) or, if fixed naively, over-broad access. | Rewrite ingress `from` to `namespaceSelector kube-system` + `podSelector app.kubernetes.io/name=traefik` (Phase 3). |
| R20 | Tampering | NetworkPolicy enforcement is unproven for this k3s (flannel/embedded controller). A default-deny that is silently inert is a false control. | Empirical allow/deny proof in a disposable namespace (Phase 9); report truthfully. |
| R21 | Info disclosure | AWS-secrets dead-end: `ClusterSecretStore aws-secretsmanager` + IRSA will never resolve; pods crash-loop or run with missing secrets. | Replace with locally-managed k8s Secret; remove/gate AWS templates (Phase 3). |
| R22 | Elevation | `readOnlyRootFilesystem` set on pods but `/tmp` not always writable for nginx; emptyDir provided. | Verified frontend mounts `nginx-cache` + `/tmp` emptyDir; backends need no writes. |

## Highest-priority risks (feed Phases 3/5/8/9)

R9, R10, R13, R14, R18, R19, R20, R21. Each has a concrete control in the phase plan; none are accepted silently.

## Explicitly out of scope (with reason)

- Payment/fraud: no payment service exists (`checkout` clears cart only).
- Multi-tenant isolation of `user-service`: it is the only writer of user data.
- Cloud IAM/IRSA: no cloud account in use.
