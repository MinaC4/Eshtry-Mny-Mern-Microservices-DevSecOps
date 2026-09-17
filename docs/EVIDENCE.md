# EVIDENCE — indexed bundle

| Claim | Evidence |
|---|---|
| Full user journey works | `docs/evidence/phase3/user-journey.txt`; repeated live: products 26, register 201, login 200, cart 34.99, checkout |
| Auth UX fixed | logout `Set-Cookie` clears token; profile 401 after logout; `/login` redirects when authed; bundle contains Logout |
| Cart remove fixed | remove -> 200, cart empty after; bundle contains "Remove" |
| Receipt + profile rebuilt | bundle `/assets/index-679000f1.js` contains "Order Receipt", "Print receipt", "Member since", "Items in cart" |
| Jenkins pipeline green | build **#12/#15** SUCCESS; stages gitleaks→tests→audit→build→Trivy→SBOM→Harbor→cosign sign+verify→helm→digest pin |
| Images signed by digest | `cosign verify` output: "The signatures were verified against the specified public key" |
| GitOps deploy | Argo CD Application `eshtry-mny` `Synced/Healthy`; commit `ci: pin <n> image digests`; self-heal demo (tampered ConfigMap reverted) |
| Unsigned image rejected | Kyverno admission denial for `eshtry-mny-user:0.1.0-homelab` (Enforce window) |
| NetworkPolicy enforced | in-pod TCP tests: cart→product ALLOWED, product→cart BLOCKED, user→1.1.1.1 BLOCKED (`docs/09-network-security.md`) |
| Secret rotation | old token -> 401, re-login -> 200 |
| Smoke test | Argo PostSync Job `succeeded=1`, logs `SMOKE OK` |
| Image CVEs remediated | Trivy HIGH/CRITICAL = 0 on all four images |
| gitleaks was a no-op | planted GitHub PAT: before fix Passed, after fix Failed (`PHASE-2-REPORT.md`) |

Artifacts: `docs/evidence/phase3/`, `docs/phases/PHASE-*-REPORT.md`, `security/cosign.pub`.
