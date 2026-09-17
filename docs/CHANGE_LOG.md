# CHANGE LOG

Every object/file this engagement creates, with create + remove commands. Cluster entries are appended from Phase 3 onward.

## Git

| Date | Ref | Change |
|---|---|---|
| Phase 0 | branch `devsecops/homelab-engagement` | created from `main` (`git checkout -b devsecops/homelab-engagement`) |

## Repository files (Phase 0/1 — docs only, no infra touched)

Created:
- `docs/STATE.md`
- `docs/00-application-analysis.md`
- `docs/00-threat-model.md`
- `docs/00-build-matrix.md`
- `ci/services.yaml`
- `docs/01-infrastructure-inventory.md`
- `docs/01-capacity-budget.md`
- `docs/01-ADR-0001-homelab-adaptation.md`
- `docs/phases/PHASE-0-REPORT.md`
- `docs/phases/PHASE-1-REPORT.md`
- `docs/CHANGE_LOG.md` (this file), `docs/ROLLBACK.md`, `docs/ISSUES.md`

Remove (rollback of docs-only work): `git checkout main && git branch -D devsecops/homelab-engagement` (after pushing nothing to main) or `git revert <squash-merge>`. No cluster impact.

## Phase 2 — Git/pre-commit

Created/modified (repo only):
- `.pre-commit-config.yaml` (new) — gitleaks, hadolint, check-yaml, detect-private-key, check-added-large-files, helm lint/template, frontend tsc. Installed to `.git/hooks/pre-commit`.
- `.gitleaks.toml` (modified) — added `[extend] useDefault = true`. **Security fix:** the previous config silently disabled all gitleaks rules (no-op scan in pre-commit and Jenkins).
- `docs/02-git-strategy.md`, `docs/CHANGE_REQUESTS.md`, `docs/phases/PHASE-2-REPORT.md` (new).

Remove: `pre-commit uninstall`; `git checkout main -- .gitleaks.toml` (only if deliberately reverting the fix — not recommended).

## Phase 3 — Baseline deployment

Repo changes:
- `eshtry-mny/values.yaml` (Harbor images, traefik ingress, right-sized HPA/PDB, secrets/mongodb/registry/security blocks)
- `eshtry-mny/templates/secret.yaml` (new), `registry-secret.yaml` (new), `mongodb.yaml` (new), `networkpolicy-mongodb.yaml` (new)
- `eshtry-mny/templates/{user,product,cart,frontend}-deployment.yaml` (numeric uid, imagePullSecrets)
- `eshtry-mny/templates/{user,product,cart,frontend}-hpa.yaml` (min 1 / max 3)
- `eshtry-mny/templates/pdb.yaml` (maxUnavailable)
- `eshtry-mny/templates/networkpolicy-*.yaml` (traefik ingress, Mongo podSelector egress)
- `eshtry-mny/templates/kyverno-*.yaml` (namespace scoping, controller-only kinds, pattern-based deny-latest)
- `eshtry-mny/templates/externalsecret.yaml`, `clustersecretstore.yaml` (gated off); `namespace.yaml` (removed)
- `User|Product|Cart/Dockerfile` (uid 1001); `*/config/db_conn.js` (MONGO_URI); `*/server.js` (trust proxy); `User/controllers/usercontroller.js` (cookie secure); `Product/middleware/validateRequest.js` + `routes/filterRouter.js` (zod)
- 4× `package-lock.json` (internal reg `package-firewall.replit.local` -> `registry.npmjs.org`); `front-end/package.json` (removed `fs` placeholder)

Harbor: project `eshtry-mny`; robot `robot$eshtry-mny+eshtry-mny-puller` (pull-only).

Cluster (namespace `eshtry-mny`, created by `--create-namespace`):
- Deployments: `user-service`, `product-service`, `cart-service`, `frontend`
- StatefulSet: `mongodb` (+ 2Gi PVC `data-mongodb-0` via `local-path`)
- Services: `user-service:9001`, `product-service:9000`, `cart-service:9003`, `frontend:80`, headless `mongodb:27017`
- Ingress `eshtry-mny-ingress` (class traefik)
- NetworkPolicies: default-deny-all + 4 service allow + mongodb-allow
- HPAs ×4, PDBs ×4, ConfigMap `app-config`, Secrets `app-secrets` + `harbor-creds`
- ClusterPolicies (scoped to eshtry-mny): `deny-latest-tag`, `require-non-root`, `require-readonly-rootfs`, `require-resource-limits`

Remove:
```
helm uninstall eshtry-mny -n eshtry-mny
kubectl delete clusterpolicy deny-latest-tag require-non-root require-readonly-rootfs require-resource-limits
kubectl delete namespace eshtry-mny
kubectl delete application eshtry-mny -n argocd
```
(Harbor project/robots removal is manual in the Harbor UI/API.)

## Phase 3+ — GitOps / supply chain

Harbor:
- project `eshtry-mny` (private)
- robot `robot$eshtry-mny+eshtry-mny-puller` (pull-only, used by `harbor-creds`)
- robot `robot$eshtry-mny+eshtry-mny-ci` (push+pull, for Jenkins)

Argo CD:
- Application `eshtry-mny` in `argocd` (auto-sync, prune, selfHeal). Cluster tracks the branch during development; committed manifest tracks `main`.

Out-of-band secrets (not in Git, not Argo-managed):
- `app-secrets`, `harbor-creds` in `eshtry-mny`, created by `ci/scripts/create-secrets.sh`.

cosign:
- keypair generated locally at `~/.config/eshtry-mny/cosign.key` (password in `cosign.key.pass`), public key committed at `security/cosign.pub`.
- images signed by digest: user/product/cart `0.1.0`, user `0.1.2`, frontend `0.1.1`.

## Phase 4/5/8 additions
- Jenkins job `eshtry-mny` + credentials `harbor-ci`, `cosign-key`, `cosign-password`, `github-token`.
- Harbor robot `robot$eshtry-mny+eshtry-mny-ci` (push+pull).
- ClusterPolicy `eshtry-verify-images` (scoped to `eshtry-mny`), `validationFailureAction: Audit` (see docs/08-policy-as-code.md for why not Enforce).
- Secret `harbor-creds` in namespace **`kyverno`** (pull-only robot for the `eshtry-mny` project) so verify-images can authenticate. Additive only.
- App fix: `POST /api/v1/users/logout`; frontend redirects authenticated users away from `/login` & `/register`; NavBar Login/Logout.

Remove (rollback): `kubectl delete secret harbor-creds -n kyverno`; `kubectl delete clusterpolicy eshtry-verify-images`; delete the Jenkins job/credentials via the UI.


