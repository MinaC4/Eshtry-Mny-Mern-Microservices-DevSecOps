# PHASE 10 REPORT — Dynamic Testing + Observability

Status: **PARTIAL** (smoke ✅ ; ZAP ❌ ; app metrics ❌).

- **Smoke test DONE**: Kubernetes Job as an **Argo CD PostSync hook** (`eshtry-mny/templates/smoke-test.yaml`, namespace `eshtry-mny-tests`) runs `/ → register → login → add-to-cart → checkout` through the Ingress. Result: `succeeded=1`, logs `SMOKE OK`. It gate-failed the sync when the app was broken (cross-service 401 from an incomplete secret rotation), proving it blocks a bad deploy.
- **ZAP DAST not run** — documented waiver (resource budget/time). Endpoints were exercised directly incl. input validation; a `security/zap/` run + triage is the recommended follow-up.
- **Observability partial**: kube-prometheus-stack exists, but the Node services expose no `/metrics`, so there are no application request/error/latency series to dashboard. Adding `prom-client` is a further code change; deferred rather than faked.

Deliverable: `docs/10-dynamic-testing.md`.
