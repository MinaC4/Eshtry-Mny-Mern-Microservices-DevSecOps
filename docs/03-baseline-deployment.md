# 03 — Baseline Deployment (homelab-correct)

Status: deployed and verified end-to-end. Release `eshtry-mny` revision 4, namespace `eshtry-mny`.

## Order of operations (all real)
1. Created Harbor project `eshtry-mny` (HTTP 201) and a pull-only robot `robot$eshtry-mny+eshtry-mny-puller`.
2. Fixed app/chart portability issues (below), built and pushed four images to Harbor:
   `192.168.1.8:30082/eshtry-mny/eshtry-mny-{user,product,cart,frontend}`.
3. Rendered with `helm template` (32 objects) and deployed with:
   ```
   helm upgrade --install eshtry-mny ./eshtry-mny -n eshtry-mny --create-namespace -f values-secret.yaml
   ```
   (`values-secret.yaml` is git-ignored: Mongo credentials, JWT secret, Harbor robot.)
4. Imported `products.json` (26 docs) into the in-cluster MongoDB with `mongoimport`.
5. Verified the full journey (see `evidence/phase3/user-journey.txt`).

## Chart/app changes (ADR-0001)
- Ingress class `nginx` -> `traefik`; host -> `eshtry-mny.192.168.1.8.nip.io`.
- All four NetworkPolicies: ingress `from ingress-nginx` -> `kube-system` + `podSelector app.kubernetes.io/name=traefik`.
- Mongo egress `0.0.0.0/0:27017` -> `podSelector app: mongodb`; new `mongodb-allow` ingress policy.
- AWS `ClusterSecretStore` + `ExternalSecret` gated behind `externalSecrets.enabled=false`; new local `app-secrets` Secret.
- New in-cluster MongoDB StatefulSet (`mongo:7.0`, 2Gi local-path PVC, `--wiredTigerCacheSizeGB 0.25`) + headless Service.
- HPA min 1 / max 3; PDB `minAvailable:1` -> `maxUnavailable:1`.
- Backend Dockerfiles: numeric UID 1001; chart sets `runAsUser/runAsGroup/fsGroup` + `seccompProfile: RuntimeDefault` + `capabilities.drop:[ALL]` (required: non-numeric `USER` is rejected with `runAsNonRoot: true`).
- Kyverno chart policies scoped to `namespaces: [eshtry-mny]` and match only controllers (Pod/CronJob shape bug fixed); `deny-latest-tag` rewritten from invalid `container.image` variable to a `pattern`.
- New `registry-secret.yaml` (Harbor pull secret) + `imagePullSecrets` on all pods.
- Removed `templates/namespace.yaml` (Helm `--create-namespace` / Argo `CreateNamespace=true` own it).
- App fixes: `MONGO_URI` support with SRV fallback; `trust proxy = 1` behind Traefik; login cookie `secure` only when the public origin is HTTPS; `filterRouter` zod validation.

## Verified controls
- 5/5 workloads Running/Ready; Kyverno PolicyReports: **PASS 4 / FAIL 0** for all five.
- Resource usage (moderate): user 30Mi, product 29Mi, cart 31Mi, frontend 4Mi, mongodb 88Mi.
- RBAC: anonymous write to `POST /api/v1/products` -> 403; `filter/price/abc` -> 400.

## Known limitations / tradeoffs
- HTTP only (no TLS on the LAN); cookie `secure` is therefore off. See ADR D2.
- MongoDB credentials are local Kubernetes Secrets, not Vault (ADR D1).
- Images are tagged `0.1.0-homelab*`; digest pinning/signing lands in Phase 5.

## Rollback
See `docs/ROLLBACK.md` (Phase 3+ section).
