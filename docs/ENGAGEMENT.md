# ENGAGEMENT — Homelab DevSecOps Adaptation

This document is the concise charter for the engagement that produced the changes in this
repository. The full master prompt is held by the operator; this is the durable summary so a
future session can resume without re-reading everything.

## Scope
Adapt the existing `Eshtry-Mny` MERN microservices project from its cloud-reference design
(Docker Hub, AWS Secrets Manager/IRSA, ingress-nginx, MongoDB Atlas) to the operator's real k3s
homelab, close the supply-chain gaps, and run everything on the operator's own tools.

## Environment (facts)
- k3s `v1.36.2+k3s1`; context `default`; nodes `mina`(16Gi), `worker-1`, `worker-2`.
- Ingress **Traefik** (`kube-system`); no ingress-nginx.
- Installed: Jenkins, Harbor, Argo CD, Kyverno, external-secrets (Vault wiring broken), Vault
  (`inmem`), kube-prometheus-stack, trivy-operator. **No Falco/Loki.**
- Source control: GitHub (Gitea excluded). Registry: Harbor project `eshtry-mny`.

## Decisions (ADR-0001)
In-cluster MongoDB · local Kubernetes Secret (out-of-band) · Harbor · Jenkins CI ·
Argo CD GitOps · Kyverno scoped to `eshtry-mny` · HPA min1/max3.

## Rules of engagement (honoured)
Read-only cluster unless additive and scoped; changes logged in `CHANGE_LOG.md` with teardown in
`ROLLBACK.md`; real output only (`NOT EXECUTED` over guessing); one phase at a time with a report;
three-strike stop; token economy; existing components never upgraded/duplicated without a
CHANGE_REQUEST.

## Current status / resume
See `docs/STATE.md` and `docs/GAP-ANALYSIS.md`. Deployer of record is **Argo CD** (do not run
`helm upgrade`). Secrets via `ci/scripts/create-secrets.sh`. Pipeline job `eshtry-mny` tracks
`main`.
