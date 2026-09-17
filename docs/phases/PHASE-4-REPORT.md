# PHASE 4 REPORT — Jenkins Pipeline Review & Hardening

Status: **DONE** — real pipeline run succeeds end to end (build #12).

## What ran / created (additive only)
- New Jenkins credentials: `harbor-ci`, `cosign-key`, `cosign-password`, `github-token`.
- New job `eshtry-mny` (Pipeline from SCM, branch `devsecops/homelab-engagement`). Existing `boutique-app-ci` untouched.
- Extended `Jenkinsfile` (Harbor registry, containerised node/yq/helm/sonar, SBOM, cosign sign/verify, digest pinning).
- Harbor CI robot `robot$eshtry-mny+eshtry-mny-ci` (push+pull).

## Real failures hit and fixed
1. Agent had no npm -> run tests/audit in `node:20-alpine`.
2. `junit` plugin absent -> removed the step.
3. `npm audit` (all deps) blocked on dev-only `nodemon/semver` -> audit production deps (`--omit=dev`), images install `--omit=dev`.
4. bcrypt 5 pulled a critical `tar` -> upgraded to bcrypt 6.
5. Trivy parallel DB downloads were flaky -> shared offline DB cache, sequential scans.
6. cosign needs registry auth -> mount the workspace docker config, run as root.
7. yq non-root couldn't write root-owned `values.yaml` -> `--user 0:0`.
8. `GIT_BRANCH` parameter collided with the Git plugin env var -> renamed to `GITOPS_BRANCH` with the plugin branch as fallback.

## Evidence
Build **#12 SUCCESS**; stages: gitleaks, tests, build, audit, Trivy, SBOM, Harbor push, cosign sign+verify, helm lint/template, digest pin + push (`1f64f3a` on the branch).

## Definition of Done
- [x] All pre-existing gates still run and pass.
- [x] New SBOM/sign/verify stages run in the same pipeline.
- [x] A real run produces a digest-pinned commit consumed by Argo CD.
- [ ] Webhook trigger — not possible (LAN Jenkins); API trigger / polling documented.
