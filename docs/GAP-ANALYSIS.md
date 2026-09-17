# GAP ANALYSIS — prompt vs delivered

Date: after merge to `main` (commit `43573f4`/`1a8501f`). Legend: ✅ done · ⚠️ partial · ❌ not done.

## Phase-by-phase
| Phase | Status | Notes |
|---|---|---|
| 0 — app comprehension | ✅ | `docs/00-application-analysis.md`, `00-threat-model.md` (22 risks), `00-build-matrix.md`, `ci/services.yaml`, `phases/PHASE-0-REPORT.md` |
| 1 — infra discovery (read-only) | ✅ | `01-infrastructure-inventory.md`, `01-capacity-budget.md`, `01-ADR-0001-homelab-adaptation.md`, report |
| 2 — git/pre-commit | ⚠️ | pre-commit + fixed no-op gitleaks ✅, report ✅. **Branch protection BLOCKED** (no repo admin) → CR-1 |
| 3 — baseline deploy | ✅ | 5 workloads Running, full register→login→browse→cart→checkout verified, `03-baseline-deployment.md`, report |
| 4 — Jenkins hardening | ✅ | Harbor, containerised tooling, SBOM, cosign, digest pin; build **#15 SUCCESS**; `04-jenkins-security-review.md`, report. No webhook (LAN) |
| 5 — supply chain | ⚠️ | SBOM+sign+verify+digest pin+CVE remediation ✅; unsigned rejection proven. **Kyverno `verify-images` = Audit** (Enforce blocked by Kyverno 1.18.2 private-realm guard) |
| 6 — secrets | ⚠️ | Local Secret + **rotation proven** (old token 401 / re-login 200). Missing dedicated `docs/06-secrets-management.md` + `PHASE-6-REPORT.md` |
| 7 — GitOps | ✅ | Argo CD registered, auto-sync + self-heal proven, `docs/07-gitops.md`. Rollback via `git revert` documented, not executed. No PHASE-7 report |
| 8 — policy as code | ⚠️ | 4 chart policies Enforce + verify-images Audit; unsigned rejection transcript; `docs/08-policy-as-code.md`. No PHASE-8 report |
| 9 — network + runtime | ⚠️ | NetworkPolicy enforcement **proven** (allowed/denied), `docs/09-network-security.md`. **Falco not installed** (not approved) → out of scope. No PHASE-9 report |
| 10 — dynamic testing + obs | ⚠️ | Smoke Job as Argo PostSync hook ✅ (`SMOKE OK`). **Observability DONE** (prom-client `/metrics`, ServiceMonitor, Prometheus 3/3 targets up, Grafana dashboard loaded). **ZAP attempted but blocked** by image pull failure (`ghcr.io` connection reset) — recorded NOT EXECUTED |
| 11 — docs & evidence | ⚠️ | `SECURITY.md`, `EVIDENCE.md`, `COMPARISON.md`, `DEMO.md`, README section ✅. Missing `PHASE-11-REPORT.md` and `docs/06-secrets-management.md` |

## Section 5 acceptance criteria
| Criterion | Status |
|---|---|
| Preflight every session; real output only | ✅ |
| Section 0 fully resolved | ✅ |
| Pre-engagement restore point exported | ❌ **not exported** (`docs/evidence/pre-engagement/` absent) — 1.11 gap |
| Every service documented; Section 2.7 gaps confirmed | ✅ |
| Threat model ≥12 risks | ✅ (22) |
| Zero writes in Phase 1; numeric capacity | ✅ |
| helm install + full journey proven | ✅ |
| Ingress + NetworkPolicy mismatch fixed | ✅ |
| Pre-existing Jenkins gates pass | ✅ |
| SBOM + sign + verify in pipeline | ✅ |
| verify-images Enforce + unsigned rejected | ⚠️ proven under Enforce, left in **Audit** |
| AWS dead-end resolved | ✅ |
| No secret material in repo; rotation demonstrated | ✅ |
| Argo auto-sync + git-revert rollback demonstrated | ⚠️ auto-sync ✅; revert documented not run |
| NetworkPolicy enforcement proven | ✅ |
| ≥2 Falco rules | ❌ Falco not installed |
| Smoke test gates a bad deploy | ⚠️ runs as PostSync hook and failed when the app was broken (blocked health); no deliberate bad-deploy demo |
| ZAP findings triaged | ❌ ZAP not run |
| README/SECURITY/EVIDENCE/COMPARISON/DEMO | ✅ |

## Expected-tree gaps — RESOLVED since first pass
- Added: `docs/06-secrets-management.md`, `docs/phases/PHASE-{6,7,8,9,10,11}-REPORT.md`, `tests/smoke/smoke.sh`, `docs/ENGAGEMENT.md`, `docs/evidence/state-snapshot/` (post-engagement restore point; the rule-1.11 *pre*-engagement export was missed and is recorded).
- Rollback via `git revert` **rehearsed**: reverted the digest-pin commit → Argo re-deployed the previous digests → revert-of-revert restored. Evidence recorded.
- UI bugs fixed: Login/Register background asset paths (`src/assets/...` → `../assets/...`) and CSP (invalid `connect-src` removed; the project's Font Awesome/Google Fonts CDNs allowed). Deployed; `background1/2.jpg` and other assets return 200.
- Still absent by design: `security/zap/` (ZAP not run).

## Remaining work (prioritised)
1. **Branch protection** (CR-1, needs repo admin).
2. Decide **Kyverno Enforce** path (Harbor hostname+node registries.yaml, or Kyverno upgrade).
3. **SonarQube** server pod down (deferred by operator).
4. **Falco** (deferred by operator).
5. **ZAP** baseline once the image can be pulled (network).
6. Optional: pre-engagement export (post-engagement snapshot taken), rollback rehearsal already done.

## Bottom line
The system is **deployed, tool-driven and working** (Jenkins → Harbor → Git → Argo CD, signed digest-pinned images, full app journey, smoke gate, proven NetworkPolicy, proven rotation). The gaps are either **operator decisions** (branch admin, Kyverno path, SonarQube, Falco/ZAP permissions) or **documentation/backup completeness** (phase reports 6–11, `06-secrets-management.md`, pre-engagement export).
