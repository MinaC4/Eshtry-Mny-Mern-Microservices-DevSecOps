# PHASE 2 REPORT — Git, Branch Protection, Pre-Commit Controls

Status: **DONE (one blocked item: branch protection).** No cluster writes.

## What ran
- Confirmed remote and permissions: `gh api repos/.../--jq .permissions` -> `{"admin":false,"push":true,...}`.
- Checked protection: `GET /branches/main/protection` -> **404 (none)**.
- Created `.pre-commit-config.yaml`, `pre-commit install`, `pre-commit run --all-files`.
- Planted-secret test through the hook (then removed).

## Critical finding and fix
`.gitleaks.toml` had **no rules and no `[extend] useDefault = true`**. gitleaks v8 replaces its built-in rules when given a config, so the secret scan (pre-commit **and** the existing Jenkins stage) was silently matching nothing.

Proof it was broken (before fix, staged GitHub PAT):
```
gitleaks secret scan.....................................................Passed
```
Proof after fix (`[extend] useDefault = true`), same planted PAT:
```
gitleaks secret scan.....................................................Failed
- hook id: gitleaks
- exit code: 1
Finding:     token = REDACTED
RuleID:      github-pat
File:        /repo/leakcheck.txt
Line:        1
WRN leaks found: 1
```
Planted file removed; `git status` clean apart from intended changes.

`pre-commit run --all-files`:
```
check for merge conflicts................................................Passed
check json...............................................................Passed
detect private key.......................................................Passed
check for added large files..............................................Passed
check yaml...............................................................Passed
gitleaks secret scan.....................................................Passed
hadolint Dockerfile lint.................................................Passed
helm lint................................................................Passed
helm template (render check).............................................Passed
frontend typecheck (tsc).................................................Passed
```

## Deliverables
- `.pre-commit-config.yaml` (installed at `.git/hooks/pre-commit`)
- `.gitleaks.toml` fixed (`useDefault = true`)
- `docs/02-git-strategy.md`
- `docs/CHANGE_REQUESTS.md` (CR-1..CR-5)

## Definition of Done
- [x] pre-commit runs clean on the whole tree.
- [x] Planted-secret test proven blocked with real hook output.
- [ ] Branch protection verified — **BLOCKED on repo admin (CR-1)**; do not claim enforced.

## Deviations
- Branch protection could not be applied (account lacks admin). Escalated as CR-1.

## Side-effect found for Phase 3
hadolint surfaced DL3066 (non-numeric `USER appuser`). On Kubernetes, `runAsNonRoot: true` + a non-numeric image user is rejected by kubelet ("cannot verify user is non-root"). The backend Dockerfiles must use a **numeric** uid and the chart must set `runAsUser`, or pods will not start. Logged for Phase 3.
