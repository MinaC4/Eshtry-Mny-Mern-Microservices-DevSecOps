# PHASE 1 REPORT — Infrastructure Discovery (read-only)

Status: **DONE**. Zero writes to the cluster. (The Phase 9 network test is the only sanctioned future write and has not run.)

## What ran (read-only)
`kubectl config current-context`, `version`, `get nodes -o wide|-o json`, `describe nodes`, `top nodes`, `get ns`, `get ingressclass`, `get pods -A`, `get svc -A`, `helm list -A`, `get clusterpolicy`, `get clustersecretstores,secretstores -A`, `exec -n vault vault-0 -- vault status`, Harbor API `GET /projects`, `git remote -v`, `git push --dry-run`.

## Findings (evidence-backed)
- Context `default`, server `v1.36.2+k3s1`, 3 nodes, storage `local-path`.
- Ingress = **Traefik** (default class, `kube-system`); **no ingress-nginx namespace** -> gap 2.7.2 confirmed as a real break.
- Kyverno 1.18.2 installed with 16 ClusterPolicies; no name collision with the chart's four; **but the chart's four are cluster-wide**.
- ESO installed; `SecretStore/vault` `InvalidProviderConfig`; Vault unsealed but `inmem` -> AWS/ESO dead-end resolved to local Secret.
- Argo CD, Jenkins, Harbor, Prometheus present; no Falco, no Loki.
- Capacity: `mina` 80% memory used; 12-pod minimum is unsafe -> min 1 / max 3.
- Harbor projects `apps/boutique/hephastos/library`; no `eshtry-mny` project.

## Deliverables
- `docs/01-infrastructure-inventory.md`
- `docs/01-capacity-budget.md` (numeric verdict + revised HPA table)
- `docs/01-ADR-0001-homelab-adaptation.md` (D1–D10 decisions)

## Definition of Done
- [x] Every Section 0 `UNKNOWN` resolved from the real cluster (or escalated): ingress class/ns, netpol enforcement status, secrets backend, Jenkins model, capacity, registry.
- [x] Zero write operations.
- [x] Ingress + NetworkPolicy-enforcement questions answered with real command output.

## Open items / blocked on operator
1. **Falco** — install for Phase 9? (not installed; default = skip unless approved)
2. **OWASP ZAP** — permitted to run baseline scan in Phase 10? (against `eshtry-mny`, destructive routes excluded)
3. **Kaniko/rootless BuildKit** — replace host-Docker Jenkins builds? (default = keep as documented tradeoff)
4. **Harbor project creation** — approve creating project `eshtry-mny` + robot account (Phase 4).
5. **Branch/merge policy** — confirm: per-phase commits on `devsecops/homelab-engagement`; merge to `main` after each phase is verified, or one merge at the end?
