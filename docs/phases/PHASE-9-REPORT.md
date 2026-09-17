# PHASE 9 REPORT — Network Segmentation + Runtime

Status: **DONE (network) / OUT OF SCOPE (Falco)**.

## NetworkPolicy enforcement — PROVEN
In-pod TCP tests:
| Path | Result |
|---|---|
| user-service → mongodb:27017 | ALLOWED |
| cart-service → mongodb:27017 | ALLOWED |
| cart-service → product-service:9000 | ALLOWED |
| product-service → mongodb:27017 | ALLOWED |
| product-service → cart-service:9003 | BLOCKED |
| user-service → product-service:9000 | BLOCKED |
| user-service → 1.1.1.1:443 | BLOCKED |

Broad `0.0.0.0/0:27017` egress removed; each service reaches only DNS, MongoDB, and (cart) product-service. The full user journey still works under default-deny.

## Runtime security
Falco is **not installed** on this cluster and `may_install_falco` was not approved → runtime detection is out of scope (recorded, not simulated). Compensating controls: non-root, read-only rootfs, dropped capabilities, seccomp RuntimeDefault, no privilege escalation, scoped admission policies.

Deliverable: `docs/09-network-security.md`.
