# 10 — Dynamic Testing & Observability

## Smoke test (done)
A Kubernetes Job runs as an **Argo CD PostSync hook** after every sync and walks the real user journey through the Ingress:
```
GET / -> 200
register -> login -> add-to-cart -> checkout  (must print "Checkout completed")
SMOKE OK
```
- Manifest: `eshtry-mny/templates/smoke-test.yaml` (namespace `eshtry-mny-tests`, image `curlimages/curl:8.10.1`, retries transient 429s).
- Result: Job `succeeded=1`, Argo `Synced/Healthy`.
- It caught a **real bug**: after rotating `ACCESS_TOKEN` only `user-service` had been restarted, so `cart-service` still signed/verified with the old secret and cross-service auth returned 401. Restarting all three backends fixed it. Lesson recorded: rotate the secret, then roll **all** consumers before validating.

## DAST (OWASP ZAP) — NOT RUN (documented waiver)
ZAP baseline was approved in principle but **not executed**: the homelab resource budget is tight and a ZAP run needs a dedicated pod plus scan time. The endpoints were instead exercised directly (see `FUNCTIONAL-REVIEW.md`) including input validation (`/filter/price/abc` -> 400). Recommended next step: run `zap-baseline.py` against `http://eshtry-mny.192.168.1.8.nip.io` excluding `DELETE /api/v1/cart/checkout`, triage results here.

## Observability — PARTIAL (documented gap)
kube-prometheus-stack is present, but the three Node services do **not expose a `/metrics` endpoint**, so there are no application-level (request rate / error rate / latency) metrics to scrape. Adding them requires instrumenting the services (e.g. `prom-client`) — a code change outside the current fix scope. Currently available: pod/container metrics, Kyverno policy reports, and the app's structured pino logs. A Grafana dashboard needs the metrics first; deferred with this note rather than faked.
