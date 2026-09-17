# 06 — Secrets Management

## Backend: local Kubernetes Secret (ADR D1)
The cluster's ESO↔Vault wiring is non-functional (`InvalidProviderConfig`) and Vault stores data `inmem`, so ESO was **not** used and Vault was **not modified**. The app uses a plain Kubernetes Secret created out of band.

- Secret `app-secrets` (keys `MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_URI`, `ACCESS_TOKEN`) and `harbor-creds` (dockerconfigjson).
- Created idempotently by `ci/scripts/create-secrets.sh` from the git-ignored `values-secret.yaml`.
- Kept **out of the Helm chart** (`secrets.create=false`) so Argo CD never renders/reverts/prunes them; they carry `argocd.argoproj.io/sync-options: Prune=false`.
- Verified: `grep -rIn` finds no secret material in Git; gitleaks (blocking) passes; `values-secret.yaml` and `.env` are git-ignored.

## Rotation (demonstrated)
Procedure: update `values-secret.yaml` → `create-secrets.sh` → roll **all** consumers.

Evidence:
```
before rotation: profile 200 (valid token)
rotate ACCESS_TOKEN + restart user/product/cart
old token after rotation: 401
re-login: 200
```
**Lesson:** rotating `ACCESS_TOKEN` requires restarting **every** service that verifies it (user, product, cart). Restarting only one caused cross-service 401 — caught by the smoke test.

## App credentials
MongoDB is dedicated and in-cluster; credentials live only in `app-secrets` and `values-secret.yaml` (never committed). Harbor robots are project-scoped (pull-only for the cluster, push+pull for CI).

## Tradeoff (documented)
A real secret manager would be stronger. This is a deliberate homelab tradeoff; see CHANGE_REQUEST CR-2 for the Vault/ESO option.
