# 01 — Capacity Budget (numeric verdict)

Source: `kubectl get nodes -o json`, `kubectl describe nodes` (Allocated resources), `kubectl top nodes`.

## Cluster capacity and current pressure

| Node | Alloc CPU | Alloc Mem | Mem used (top) | Mem requests | Mem req % | Mem limits % |
|---|---|---|---|---|---|---|
| mina (control-plane) | 8 | 14.81Gi | 12.2Gi (**80%**) | 5.65Gi | 38% | 167% |
| worker-1 | 4 | 5.59Gi | 3.1Gi (54%) | 3.34Gi | 59% | 139% |
| worker-2 | 3 | 3.73Gi | 1.7Gi (45%) | 2.49Gi | 67% | 138% |

**Verdict:** `mina` is the bottleneck — already at 80% actual memory with 110 pods cluster-wide. Request headroom is `~9.1Gi / 2.25Gi / 1.24Gi`; real free memory is only ~7Gi total. The chart's original `minReplicas: 3` × 4 services = **12 pods minimum**, and at maxReplicas 10 it could reach **40 pods** — not safe here. HPA `maxReplicas: 10` on four services is the single biggest capacity risk after Kyverno/Falco/monitoring already running.

## Default per-pod footprint (unchanged from chart)

| Workload | CPU req/limit | Mem req/limit |
|---|---|---|
| user / product / cart / frontend | 100m / 300m | 128Mi / 256Mi |
| mongodb (new, StatefulSet) | 100m / 500m | 256Mi / 512Mi |

## Right-size verdict (applied in Phase 3)

| HPA | min | max | CPU target | Mem target |
|---|---|---|---|---|
| user-service-hpa | **1** | **3** | 70% | 80% |
| product-service-hpa | **1** | **3** | 70% | 80% |
| cart-service-hpa | **1** | **3** | 70% | 80% |
| frontend-hpa | **1** | **3** | 70% | 80% |
| `replicaCount` (values) | **1** | — | — | — |

- Minimum footprint: 4×(100m/128Mi) + Mongo(100m/256Mi) ≈ **500m CPU / 768Mi mem requests**.
- Full-scale footprint (all at 3): 12×(100m/128Mi req, 300m/256Mi limit) + Mongo ≈ **1.3 CPU / 1.8Gi requests, 3.6 CPU / 3.1Gi limits** — fits across the three nodes.
- HPA memory target is relative to requests (128Mi); Node services idle ~60–90Mi, so scaling triggers at ~102Mi — sensible.

## PDB adjustment

With `minReplicas: 1`, `minAvailable: 1` would block all voluntary disruptions (node drains, upgrades) for a single-replica service. Phase 3 changes the four PDBs to `maxUnavailable: 1` (gated via values so prod can restore `minAvailable`). This keeps rolling updates/evictions possible while still preventing accidental full-outage.

## Scale-up guardrail

If `maxReplicas` is later raised for a demo, do it one service at a time and watch `kubectl top nodes`; `mina` must stay below ~85% memory. No new cluster-wide component (Kyverno/Falco/monitoring) will be installed by this engagement.
