# 02 — Git Strategy

## Model (preserved, not restructured)
This repository keeps application source + the Helm chart in **one repo**, and Jenkins promotes by bumping image tags in `eshtry-mny/values.yaml` and pushing to `main` (single-repo GitOps). That is a legitimate pattern for a single-operator project and is **kept**. The only source-control change is that Gitea is excluded by operator decision; GitHub remains the authority.

## Remote
- `origin` = `https://github.com/MinaC4/Eshtry-Mny-Mern-Microservices-DevSecOps.git` (public)
- Auth account on this machine: `Hephast0s` (scopes: repo, workflow, read:org). `push` = true, **`admin` = false**.

## Branch flow
```
feature branch (per phase)
        │  PR + review
        ▼
devsecops/homelab-engagement   (integration branch, pushed)
        │  merge when the phase is verified end-to-end
        ▼
main  ──► Argo CD auto-sync (values bump from Jenkins)
```
- Work never lands on `main` directly except the existing Jenkins tag-bump commit.
- Merge cadence: **merge to `main` after each phase is verified** (operator default).

## Branch protection — BLOCKED (see CR-1)
Branch protection on `main` (require PR, require the Jenkins status check) needs repo **admin**. The authenticated account has only `push`. `GET /branches/main/protection` returns 404 (no protection configured).
Action required by the repo owner (`MinaC4`): enable protection, or grant the operating account admin. Until then this is an accepted, documented gap — do not claim it is enforced.

## Pre-commit gates (`.pre-commit-config.yaml`)
Runs the same checks as CI locally:
- `check-merge-conflict`, `check-json`, `check-yaml`, `detect-private-key`, `check-added-large-files`
- `gitleaks` (Docker image, staged/filesystem) — **blocking**
- `hadolint` (Docker image) on all `Dockerfile`s — `--failure-threshold warning`
- `helm lint` + `helm template` render check on `eshtry-mny/`
- `frontend typecheck` (`tsc --noEmit`)

Install: `pre-commit install`. Full run: `pre-commit run --all-files` -> currently **all pass**.

## Critical fix found in Phase 2 (R-secret-scan)
`.gitleaks.toml` defined no rules and did **not** set:

```toml
[extend]
useDefault = true
```

In gitleaks v8 a custom config **replaces** the built-in rule set. Without `useDefault`, both the pre-commit hook and the existing Jenkins `Security: Secret Scan` stage silently matched **nothing** — a no-op control. Fixed in this phase and proven by a planted GitHub PAT (`github-pat` rule, exit 1). This is the highest-value finding of Phase 2.

## Evidence
- Planted-secret block: `gitleaks` -> `Failed`, `RuleID: github-pat`, `exit code: 1` (captured in `PHASE-2-REPORT.md`).
- `pre-commit run --all-files` -> all hooks passed.
- `pre-commit installed at .git/hooks/pre-commit`.

## CI commit signing (Phase 4 decision, deferred)
The existing `Update GitOps Manifest` stage commits as `Jenkins CI <jenkins@eshtry-mny.local>`. Signing that commit requires a CI GPG key on the Jenkins agent (see CHANGE_REQUEST CR-4). No change made yet.
