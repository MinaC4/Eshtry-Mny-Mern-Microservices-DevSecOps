# ISSUES

Tracked problems found or caused during the engagement (not application bugs, which live in the threat model).

| # | Phase | Status | Issue | Resolution |
|---|---|---|---|---|
| I-1 | 0 | closed | Engagement Section 2 said 27 template files; actual count is 28. | Corrected in `00-application-analysis.md` §8. |
| I-2 | 0 | open | `Product/tests/product.test.js:42` calls a non-existent `/api/v1/products/find/...` route; test passes only because it tolerates 404/500. | Fix the test to hit the real `/:idOrName` route (Phase 4, low risk). |
| I-3 | 1 | open | Operator believed a MongoDB existed on the cluster; none does. | Confirmed none; deploy dedicated in-cluster Mongo (ADR D7). |
| I-4 | 1 | open | ESO `SecretStore/vault` (`external-secrets` ns) = `InvalidProviderConfig`; Vault storage `inmem`. | Not fixed (operator's system); bypassed with local Secret (ADR D1). Optional CHANGE_REQUEST. |
| I-5 | 1 | open | Chart's four Kyverno `ClusterPolicy` objects are cluster-wide and would affect other projects. | Scope to `eshtry-mny` (ADR D8). |
| I-6 | 1 | open | Jenkins pod has no docker sidecar; `agent any` + `docker` implies host Docker socket. | Confirm socket mount in Phase 4; keep as documented tradeoff (ADR D6). |
| I-7 | 1 | closed | No `eshtry-mny` Harbor project; push target unverified. | Created project + pull-only robot in Phase 3. |
| I-8 | 3 | closed | Backend images `USER appuser` non-numeric; kubelet rejects with `runAsNonRoot`. | uid 1001 in Dockerfiles + `runAsUser` in chart. |
| I-9 | 3 | closed | All `package-lock.json` resolved URLs pointed at `package-firewall.replit.local`. | Rewritten to `registry.npmjs.org` (580 refs). |
| I-10 | 3 | closed | Frontend `npm ci` crashed; `tsc` missing. | Removed `fs` placeholder dep, regenerated lock. |
| I-11 | 3 | closed | Kyverno `deny-latest-tag` used invalid `container.image` variable (v1.18). | Rewritten as a `pattern`. |
| I-12 | 3 | closed | Kyverno policies matched `Pod`/`CronJob` with Deployment-shaped pattern. | Controller-only kinds; autogen covers Pods. |
| I-13 | 3 | closed | Secure auth cookie unusable over HTTP-only homelab. | `secure` only when public origin is HTTPS. |
| I-14 | 3 | closed | `trust proxy` false behind Traefik -> rate limiting keyed on ingress IP. | `app.set('trust proxy', 1)` in all backends. |
