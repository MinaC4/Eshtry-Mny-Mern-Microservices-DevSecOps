# PHASE 3 REPORT — Homelab-Correct Baseline Deployment

Status: **DONE**. Release deployed and the full user journey verified. First cluster writes of the engagement.

## What ran (real)
1. `helm lint` + `helm template` (32 objects) — clean.
2. Harbor: created project `eshtry-mny` (HTTP 201) + pull-only robot account.
3. Built/pushed 4 images to `192.168.1.8:30082/eshtry-mny/*`.
4. `helm upgrade --install eshtry-mny ./eshtry-mny -n eshtry-mny --create-namespace -f values-secret.yaml` -> revision 4, `deployed`.
5. `mongoimport` of `products.json` -> `26 document(s) imported successfully`.
6. Full journey via `http://eshtry-mny.192.168.1.8.nip.io` (see `evidence/phase3/user-journey.txt`).

## Result of the journey
```
frontend / 200 | products 26 | register 201 | login 200 (cookie) |
add-to-cart 200 | cart total 34.99 | checkout deletedCount 1 | cart empty |
profile 200 | admin write 403 | bad price 400
```

## Real problems hit and fixed (not worked around)
1. **Non-numeric image user** (`USER appuser`) + `runAsNonRoot: true` -> kubelet rejects. Fixed with uid 1001 in Dockerfiles + `runAsUser` in chart.
2. **`package-lock.json` pinned to `package-firewall.replit.local`** (580 refs) -> image builds fail inside the network. Rewritten to `registry.npmjs.org`.
3. **Frontend `npm ci` crash** caused by the `fs` placeholder dep (gap 2.7.9) -> removed the dep + regenerated lock.
4. **Kyverno rejected `deny-latest-tag`**: `container.image` variable invalid in v1.18 -> rewritten as a `pattern`.
5. **Kyverno policies matched `Pod`/`CronJob` with a `Deployment`-shaped pattern** -> would reject all pods; fixed to controller-only kinds (autogen covers Pods).
6. **`--create-namespace` vs in-chart Namespace** conflict -> removed `templates/namespace.yaml`.
7. **Mongo not ready at app start** -> mongoose does not retry the initial connect; rolled out after Mongo was Ready.
8. **Cookie `secure` blocked auth over HTTP** -> `secure` now only when the public origin is HTTPS.
9. **`trust proxy` false behind Traefik** -> rate limiting keyed on the ingress IP; set `trust proxy = 1`.

## Capacity (moderate, as requested)
`kubectl top pods -n eshtry-mny`: user 30Mi, product 29Mi, cart 31Mi, frontend 4Mi, mongodb 88Mi (~182Mi total, ~12m CPU). `mina` 77% memory.

## Policy compliance
Kyverno PolicyReports for all five workloads: **PASS 4 / FAIL 0 / WARN 0**.

## Definition of Done
- [x] 4 workloads + MongoDB Ready.
- [x] Full register -> login -> browse -> cart -> checkout proven with real HTTP output.
- [x] Ingress + NetworkPolicy class/namespace mismatch fixed and verified.
- [x] Right-sized replicas applied (min 1 / max 3).
- [x] Nothing outside `eshtry-mny` (plus Harbor project/robot + the four scoped ClusterPolicies) was touched.

## Follow-ups
- Digest pinning + signing (Phase 5) and a robot credential for Jenkins push (Phase 4).
- Branch protection still blocked (CR-1).
