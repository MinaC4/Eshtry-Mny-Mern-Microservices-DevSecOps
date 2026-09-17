# PHASE 7 REPORT — GitOps (Argo CD)

Status: **DONE**.

- Application `eshtry-mny` registered in `argocd` (auto-sync, prune, selfHeal, `CreateNamespace=true`, `ignoreDifferences` on HPA-owned replicas).
- **Auto-sync proven**: Jenkins pinned digests → commit → Argo deployed without any manual `helm upgrade`; now tracks `main`.
- **Self-heal proven**: tampered `app-config` (`NODE_ENV=TAMPERED`) reverted to `production` in <30s.
- **Digest-pinned signed deploy proven**: Deployments run `repo@sha256:...`.
- **Rollback**: `git revert <digests commit> && git push` documented (rehearsal recorded in `docs/EVIDENCE.md`).
- Deliverable: `docs/07-gitops.md`.
- Current: `target=main Synced/Healthy`.
