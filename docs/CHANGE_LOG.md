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

## Cluster objects

None yet. Nothing created or modified on the cluster by this engagement.
