# k8s/base/ — Non-Canonical Reference Manifests

> **⚠️ WARNING: These are example-only manifests, NOT the canonical deployment source.**

The canonical Kubernetes deployment is the Helm chart in `eshtry-mny/`. These raw manifests exist for reference and learning purposes only.

**Do NOT apply these to a cluster running this project's Kyverno policies** — they may not satisfy all admission requirements enforced by the Helm-deployed policies.

For production deployment, use:
```bash
helm upgrade --install eshtry-mny ./eshtry-mny -n eshtry-mny --create-namespace
```
