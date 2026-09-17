# 07 — GitOps (Argo CD)

Argo CD is the deployer of record for `eshtry-mny`. Manual `helm upgrade` is no longer used.

## Registration
```
kubectl apply -f <(yq '.spec.source.targetRevision = "devsecops/homelab-engagement"' argocd-application.yaml)
```
(During development the Application tracks the working branch; the committed `argocd-application.yaml` tracks `main` and is applied after the merge.)

Application: `eshtry-mny` in namespace `argocd`
- source: `https://github.com/MinaC4/Eshtry-Mny-Mern-Microservices-DevSecOps.git`, path `eshtry-mny`, Helm values `values.yaml`
- destination: `eshtry-mny`, `CreateNamespace=true`
- syncPolicy: `automated { prune: true, selfHeal: true }`
- `ignoreDifferences` on `/spec/replicas` for the four Deployments (HPA-owned)

## Current status (real)
```
kubectl get application eshtry-mny -n argocd
Synced / Healthy
```
No unhealthy resources. `kubectl get application ... -o json` shows zero non-Healthy resources.

## Auto-sync proof
Argo CD rendered and applied commit `f4771f3` from the tracked branch without any manual deploy (the app reconciled to Synced at that revision).

## Self-heal proof (real)
```
kubectl patch cm app-config -n eshtry-mny --type merge -p '{"data":{"NODE_ENV":"TAMPERED"}}'
# -> NODE_ENV=TAMPERED
# ~15-30s later
# -> NODE_ENV=production   (Argo CD reverted the drift automatically)
```

## Secrets and GitOps
Secrets must not be rendered from Git (no Vault/SOPS/Sealed-Secrets available — ADR D1). Therefore:
- `secrets.create=false`: the chart does **not** render `app-secrets` or `harbor-creds`.
- They are created out-of-band by `ci/scripts/create-secrets.sh` (idempotent) from the git-ignored `values-secret.yaml`.
- They carry `argocd.argoproj.io/sync-options: Prune=false` and are not tracked by Argo, so Argo never renders, reverts, or prunes them.

## Migration note
The Helm release `eshtry-mny` still exists but is **no longer the source of truth**. Do not run `helm upgrade/rollback` on it; use Argo CD (`argocd app sync eshtry-mny`) or a Git commit.

## Rollback via git
```
git revert <commit-that-bumped-values.yaml>
git push
# Argo CD auto-syncs the reverted manifests
```
