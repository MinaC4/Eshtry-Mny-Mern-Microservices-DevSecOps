# 00 — Application Analysis (verified against current code)

Repo: `Eshtry-Mny-Mern-Microservices-DevSecOps` @ branch `devsecops/homelab-engagement`
Verified by direct file reads; every claim has a path. The engagement brief's application section was checked and corrected where noted.

## 1. Service inventory

| Service | Path | Runtime | Container port | Service port | Base image (final) | Auth model |
|---|---|---|---|---|---|---|
| user-service | `User/` | Node 20 / Express | 9001 | 9001 | `node:20-alpine` (mutable) | bcrypt + JWT httpOnly cookie `token`; also `Authorization: Bearer` |
| product-service | `Product/` | Node 20 / Express | 9000 | 9000 | `node:20-alpine` (mutable) | PW/reads public; `POST /` = JWT + `requireRole('admin')` |
| cart-service | `Cart/` | Node 20 / Express | 9003 | 9003 | `node:20-alpine` (mutable) | JWT required on every route |
| frontend | `front-end/` | React 18 + Vite -> nginx | 8080 | 80 | `nginxinc/nginx-unprivileged:1.27-alpine` | cookie via `axios.defaults.withCredentials = true` (`front-end/src/config/api.ts:3`) |
| mongodb | (none today) | — | — | — | — | NOT PRESENT on cluster; strategy = `in-cluster-mongodb` (dedicated) |

## 2. user-service (`User/`)

- Entrypoint `User/server.js:61`; `/health` at `:24` (mounted before rate limiter — good).
- Global limiter 100/15min `User/server.js:35`; auth limiter 10/15min `User/routes/userRouter.js:10`.
- Routes (`User/routes/userRouter.js`): `POST /api/v1/users` (register), `GET /api/v1/users` (profile, JWT), `POST /api/v1/users/login`.
- Controller `User/controllers/usercontroller.js`: bcrypt cost 10 `:27`, JWT `expiresIn 1h` `:56`, cookie `httpOnly + secure(prod) + sameSite strict` `:60-65`.
- Models `User/models/userModel.js`: unique email, `role` enum `customer|admin` default customer.
- Validation `User/middleware/validateRequest.js`: zod register/login. `tokenValidationMiddleware.js`: `jwt.verify(..., { algorithms: ['HS256'] })`.
- env required: `MONGO_USERNAME, MONGO_PASSWORD, MONGO_CLUSTER, MONGO_DBNAME, ACCESS_TOKEN`; optional `FRONTEND_ORIGIN, PORT, LOG_LEVEL, NODE_ENV`.
- DB `User/config/db_conn.js:11`: hard-coded `mongodb+srv://` URI — **no non-SRV fallback**.
- Tests `User/tests/user.test.js` (58 lines): 3 cases, mocked DB/logger. No DB integration test.

## 3. product-service (`Product/`)

- Entrypoint `Product/server.js:60`; `/health` `:24`; limiter `:35`.
- Routes `Product/routes/productRouter.js`: `GET /api/v1/products` (public), `GET /api/v1/products/:idOrName` -> `findProduct` (public), `POST /api/v1/products` (JWT+admin+zod).
- Filter routes `Product/routes/filterRouter.js`: `GET /api/v1/filter/category/:category`, `/price/:price`, `/categoryprice/:category&&:price` — **no auth, no validation** (gap 2.7.7). Controller `Product/controllers/filterController.js:10,16` passes `req.params.price` into `$lte`.
- `getProductByName` / `getProductById` in `Product/controllers/productController.js:13,22` are **dead code** (not routed).
- Validation `Product/middleware/validateRequest.js`: `createProductSchema`. `requireRole`/`tokenValidationMiddleware` duplicated from User (identical).
- env: same as user + nothing extra. DB `Product/config/db_conn.js:11` same SRV-only pattern.
- Tests `Product/tests/product.test.js` (47 lines). Note `:42` requests `/api/v1/products/find/...` which is NOT a real route (stale comment/route) — test tolerates 404/500.

## 4. cart-service (`Cart/`)

- Entrypoint `Cart/server.js:59`; `/health` `:24`; limiter `:35`.
- Routes `Cart/routes/cartRouter.js`: `GET /api/v1/cart`, `POST /api/v1/cart/:productid` (zod 24-hex), `DELETE /api/v1/cart/checkout` (clear cart), `DELETE /api/v1/cart/:productid`. All JWT.
- Controller `Cart/controllers/cartController.js`: calls product-service with axios timeout 3s + 2 retries `:8-16`; `PRODUCT_SERVICE_URL` default `http://product-service:9000` `:6` (docker-compose overrides to `http://product:9000` — intentional, documented).
- Cart unique index `{UserId, ProductId}` `Cart/models/cartModel.js:22`; duplicate -> 409 `cartController.js:72`.
- **`checkout` is not a payment flow**: `Cart/controllers/cartController.js:97` just `deleteMany` for the user.
- Tests `Cart/tests/cart.test.js` (36 lines): health + 401 guard.
- DB `Cart/config/db_conn.js:11` same SRV-only pattern.

## 5. frontend (`front-end/`)

- `front-end/Dockerfile`: Vite build -> `nginx-unprivileged:1.27-alpine`, `/etc/nginx/conf.d/default.conf` from `front-end/nginx.conf`, port 8080.
- `front-end/nginx.conf`: resolver `kube-dns.kube-system.svc.cluster.local`; security headers incl. CSP `:13`; proxies `/api/v1/{users,filter,products,cart}` to `*-service`; SPA fallback `/`.
- CSP bug: `connect-src 'self' /api/v1/` — `/api/v1/` is not a valid source expression (gap 2.7.8).
- `front-end/package.json`: `test` = `echo "No frontend tests configured" && exit 0` (gap 2.7.10); `fs: ^0.0.1-security` placeholder dep (gap 2.7.9); `build` = `tsc && vite build`.
- Login `front-end/src/pages/Login.tsx:13` posts to `/api/v1/users/login`; Cart `front-end/src/pages/Cart.tsx:20` GETs `/api/v1/cart`, redirects to `/login` on 401.

## 6. Call graph

```
browser -> Traefik (kube-system) -> Ingress eshtry-mny -> frontend:80
frontend nginx -> user-service:9001 / product-service:9000 / cart-service:9003
cart-service -> product-service:9000 (HTTP, 3s timeout, 2 retries)
user/product/cart -> MongoDB 27017
```

## 7. Cross-cutting (already-present controls — do not regress)

`helmet()`, CORS locked to `FRONTEND_ORIGIN`, two-tier rate limiting, centralized error handler with no stack leakage, pino logging, multi-stage Dockerfiles with non-root `appuser`/nginx-unprivileged, k8s `runAsNonRoot` + `readOnlyRootFilesystem` + `allowPrivilegeEscalation:false` + probes + resources + anti-affinity + PDBs + HPAs + default-deny NetworkPolicy with DNS egress.

## 8. Corrections / clarifications vs engagement Section 2

- Section 2 said product reads are `GET /:idOrName`; confirmed, but `findProduct` handles both name and ObjectId; `getProductById`/`getProductByName` unused.
- Section 2 said "27 template files"; actual `eshtry-mny/templates/` = **28 files**.
- Section 2 gap 2.7.7 confirmed: filter routes unvalidated. Fix will add a zod `priceSchema`/`categorySchema` without changing response shape.
- New finding: chart's 4 Kyverno `ClusterPolicy` objects match **all namespaces** cluster-wide, not just `eshtry-mny` — installing as-is could reject unrelated workloads (see ADR-0001 mitigation).
- New finding: `Product/tests/product.test.js:42` exercises a non-existent `/find/` route (stale test).
- New finding: no MongoDB exists anywhere on the cluster, contradicting "use the DB that's on the cluster"; decision = deploy a dedicated in-cluster MongoDB StatefulSet inside `eshtry-mny`.

## 9. Test coverage reality

Backend: 3 suites, 6 tests total, all mock Mongo; no real integration coverage. Frontend: none. This is documented, not hidden; Phase 10 adds a real in-cluster smoke test as the end-to-end gate.
