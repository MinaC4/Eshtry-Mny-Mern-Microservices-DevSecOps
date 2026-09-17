# CHANGE REQUESTS

Changes that touch systems owned by the engagement's read-only rule, or that need operator/admin action. Nothing here is executed without explicit approval.

## CR-1 — Enable branch protection on `main` (BLOCKED)
- **Rationale:** rule 1.13 / threat R16 — Jenkins auto-pushes tag bumps to `main`; without protection there is no review/status-check gate.
- **Who:** repo owner `MinaC4` (the operating account lacks admin).
- **Requested settings:** require PR before merge; require the Jenkins build status check; disallow force-push.
- **Blast radius:** GitHub repo settings only; no cluster impact.
- **Rollback:** disable the rules in GitHub settings.

## CR-2 — Optional: repair ESO ↔ Vault and use it for `eshtry-mny` (NOT REQUIRED)
- **Rationale:** `SecretStore/vault` is `InvalidProviderConfig` and Vault storage is `inmem`. A real secret manager would be stronger than a plain Secret.
- **Why not now:** fixing the operator's existing Vault/ESO wiring means editing a system that predates this engagement; Vault `inmem` also loses secrets on restart.
- **If approved:** configure a KV v2 mount + k8s auth scoped to `eshtry-mny/`, then repoint the chart's Secret to ESO.
- **Blast radius:** Vault mount/auth + ESO store; no app rewrite (key mapping unchanged).

## CR-3 — NetworkPolicy enforcement if the Phase 9 test proves it is OFF
- **Rationale:** k3s with the embedded controller is expected to enforce, but it is unproven. An inert default-deny is a false control.
- **If off:** options are (a) ensure the k3s network-policy controller is enabled, or (b) install a policy-capable CNI (Calico/Cilium). Both are cluster-wide and require approval.
- **Trigger:** only if the Phase 9 disposable-namespace test shows traffic is not blocked.

## CR-4 — CI commit signing key (optional)
- **Rationale:** make the automated `Update GitOps Manifest` commit signed.
- **Need:** a GPG keypair available to the Jenkins agent + `user.signingkey` in the job; public key published in the repo.
- **Blast radius:** Jenkins job config only.

## CR-5 — Create Harbor project `eshtry-mny` + robot account
- **Rationale:** registry migration off Docker Hub (ADR D9). Jenkins and the cluster need pull/push credentials.
- **Who:** Harbor admin (or confirm the existing `192.168.1.8:30082` credential has project-create rights).
- **Blast radius:** new Harbor project + robot account only; existing projects untouched.
