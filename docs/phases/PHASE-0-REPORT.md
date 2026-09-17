# PHASE 0 REPORT — Deep Application Comprehension

Status: **DONE**. All reads were local/read-only; no cluster writes.

## What ran
- Read Tier-1 sources: `User/`, `Product/`, `Cart/` server.js, all controllers, routes, middleware, models, config; all four Dockerfiles; `docker-compose.yml`; `Jenkinsfile`; all 28 Helm templates; `values.yaml`; `argocd-application.yaml`; `.gitleaks.toml`; `.env.example`; `front-end/nginx.conf`, `config/api.ts`, `Login.tsx`, `Cart.tsx`; the three test files.
- Verified engagement Section 2 line-by-line against the code.

## Deliverables
- `docs/00-application-analysis.md` — per-service purpose, entrypoint, ports, routes, env, dependencies, test reality, path citations.
- `docs/00-threat-model.md` — 22 risks across 5 trust boundaries (STRIDE), each mapped to a control; 8 high-priority risks drive Phases 3/5/8/9.
- `docs/00-build-matrix.md` + `ci/services.yaml` — service/build/test/port/deploy matrix.
- `docs/CHANGE_LOG.md`, `docs/ROLLBACK.md`, `docs/ISSUES.md` — opened.

## Verified corrections to the brief
- Templates are 28, not 27.
- `getProductById`/`getProductByName` are dead code; `GET /:idOrName` -> `findProduct`.
- `Product/tests/product.test.js:42` targets a non-existent `/find/` route (stale).
- Chart's four Kyverno `ClusterPolicy` objects are **cluster-wide** (blast radius) — new finding.
- No MongoDB exists on the cluster (new finding; changes the DB plan).

## Definition of Done
- [x] Every service documented with file-path citations.
- [x] Every Section 2.7 gap confirmed against current code.
- [x] `ci/services.yaml` is valid YAML (validated with `yq`).
- [x] No cluster writes.

## Deviations
- None. Phase 0 is read-only by nature.

## Risks carried forward
R7 (`filterRouter`), R13/R14 (supply chain), R18 (Kyverno scope), R9/R10 (Mongo egress/URI), R19 (ingress), R21 (AWS dead-end).
