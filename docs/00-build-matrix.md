# 00 — Build Matrix

Service -> build context -> Dockerfile -> build command -> test command -> port -> deploy.

| Service | Context | Dockerfile | Image (Harbor) | Build | Test | Port | Deploy |
|---|---|---|---|---|---|---|---|
| user-service | `User` | `User/Dockerfile` | `192.168.1.8:30082/eshtry-mny/eshtry-mny-user` | `docker build -t $REF ./User` | `cd User && npm ci && npm test` | 9001 | yes |
| product-service | `Product` | `Product/Dockerfile` | `192.168.1.8:30082/eshtry-mny/eshtry-mny-product` | `docker build -t $REF ./Product` | `cd Product && npm ci && npm test` | 9000 | yes |
| cart-service | `Cart` | `Cart/Dockerfile` | `192.168.1.8:30082/eshtry-mny/eshtry-mny-cart` | `docker build -t $REF ./Cart` | `cd Cart && npm ci && npm test` | 9003 | yes |
| frontend | `front-end` | `front-end/Dockerfile` | `192.168.1.8:30082/eshtry-mny/eshtry-mny-frontend` | `docker build -t $REF ./front-end` | `cd front-end && npm ci && npm run build` | 8080 | yes |

Notes:
- `$REF` = `192.168.1.8:30082/eshtry-mny/eshtry-mny-<svc>:<BUILD_NUMBER>` (registry decision: Harbor — see ADR-0001). Jenkins will also need a `:<git-sha>` tag for immutability.
- Tag used by Kubernetes = **digest** (`@sha256:...`), pinned by the Jenkins `Update GitOps Manifest` stage; tag remains for humans only.
- Image scan: Trivy `HIGH,CRITICAL` (blocking) per image.
- SBOM: Syft CycloneDX JSON per image (Phase 5).
- Signing: cosign key-based, by digest (Phase 5).
- `front-end` build runs `tsc` (type-check) as its test substitute until real tests exist (gap 2.7.10); this is an explicit, documented waiver.
- `products.json` (26 docs) is seed data for the Product collection — imported in Phase 3 via a Job.

## Jenkins stage order (as-is, to be extended not replaced)

1. Checkout Code
2. Quality & Tests (gitleaks blocking, npm test x3, junit)
3. Build & Dependency Audit (docker build x4, `npm audit --audit-level=high` x4)
4. Security: Docker Scan (Trivy) x4 (HIGH/CRITICAL, `--exit-code 1`)
5. Docker Login
6. Push Images x4
7. Helm Lint & Template
8. Update GitOps Manifest (`yq` tag bump -> commit -> `git push origin HEAD:main`)

New stages inserted after (4) and before (5): SBOM -> sign (after push) -> verify. Signing is always by digest.
