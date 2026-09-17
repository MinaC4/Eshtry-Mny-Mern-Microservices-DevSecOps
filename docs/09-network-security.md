# 09 — Network Security (proof) + Runtime

## NetworkPolicy enforcement — PROVEN (k3s embedded controller enforces)
Executed inside the running pods with real TCP connects:

| From | To | Policy | Result |
|---|---|---|---|
| `user-service` | `mongodb:27017` | allowed (egress) | **ALLOWED** (connected) |
| `cart-service` | `mongodb:27017` | allowed (egress) | **ALLOWED** |
| `cart-service` | `product-service:9000` | allowed (egress) | **ALLOWED** |
| `product-service` | `mongodb:27017` | allowed (egress) | **ALLOWED** |
| `product-service` | `cart-service:9003` | not allowed | **BLOCKED** (`ECONNREFUSED`) |
| `user-service` | `product-service:9000` | not allowed | **BLOCKED** |
| `user-service` | `1.1.1.1:443` | not allowed (broad egress removed) | **BLOCKED** |

Conclusion: the default-deny + per-service allow policies are **enforced**, not inert. The old `0.0.0.0/0:27017` egress is gone; each service can reach only DNS, MongoDB, and (for cart) product-service.

## Allowed-flow matrix
| Source | Allowed destination | Port |
|---|---|---|
| Traefik (`kube-system`) | all four services | 80/9000/9001/9003/8080 |
| frontend | user, product, cart | 9001/9000/9003 |
| cart | product | 9000 |
| user, product, cart | mongodb | 27017 |
| all pods | kube-system (DNS) | 53 |
| mongodb | (none) | — |

## Runtime security (Falco)
Falco is **not installed** on this cluster and `may_install_falco` was not approved, so runtime detection is out of scope for this engagement. This is recorded honestly rather than simulated. Mitigations already present instead: non-root, read-only rootfs, dropped capabilities, seccomp `RuntimeDefault`, no privilege escalation, and namespace-scoped admission policies.
