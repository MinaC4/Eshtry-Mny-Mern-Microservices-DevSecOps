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

## DAST (OWASP ZAP) — ATTEMPTED, BLOCKED by registry pull
ZAP baseline was attempted as a pod in `eshtry-mny-tests` against the Ingress. The scan never ran because the image could not be pulled (`ghcr.io/zaproxy/zaproxy:stable`: `read tcp ...: read: connection reset by peer`). Recorded as **NOT EXECUTED** (network), not as a silent waiver. Endpoints were exercised directly including input validation (`/filter/price/abc` -> 400). To run later:
`kubectl run zap -n eshtry-mny-tests --image=zaproxy/zap-stable -- zap-baseline.py -t http://eshtry-mny.192.168.1.8.nip.io -m 3 -J /tmp/report.json`.

## Observability — DONE
- Backends expose Prometheus metrics via `prom-client` (`/metrics`): default process/node metrics plus `http_requests_total{method,route,status}` and `http_request_duration_seconds` histogram.
- `ServiceMonitor eshtry-mny-backends` (label `release: prometheus`) scrapes user/product/cart every 30s; a `allow-prometheus` NetworkPolicy admits the `monitoring` namespace.
- **Verified**: Prometheus `up{namespace="eshtry-mny"}` = **1** for all three; `sum(http_requests_total{namespace="eshtry-mny"})` = 899; p95 latency ≈ 0.0095s.
- **Grafana dashboard `Eshtry-Mny`** (uid `eshtry-mny`) — detailed, **31 panels** across 5 rows, loaded by the Grafana sidecar (verified via the Grafana API):
  1. **Overview** (stats): pods running, requests/sec, 5xx error rate %, p95 latency, pod restarts (1h), scrape targets up.
  2. **Traffic & Errors**: request rate by service, requests by HTTP status, 5xx by service, top routes.
  3. **Latency**: p50/p90/p95/p99 by service, average latency by route.
  4. **Workloads & Scaling**: deployment ready vs desired replicas, HPA current vs max, pod restarts, pods ready.
  5. **Resources (pods)**: CPU, memory working set, network RX/TX per pod.
  6. **Nodes & Health**: node CPU %, memory available, filesystem available, scrape health, MongoDB pod resources.
  Source JSON: `eshtry-mny/dashboards/eshtry-mny.json` (embedded by Helm).
