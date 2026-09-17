# 08 — Policy as Code (Kyverno)

## Policies scoped to `eshtry-mny`
| Policy | Rule | Action | Status |
|---|---|---|---|
| `deny-latest-tag` | no `:latest` image tags | Enforce | Ready |
| `require-non-root` | containers `runAsNonRoot: true` | Enforce | Ready |
| `require-readonly-rootfs` | containers `readOnlyRootFilesystem: true` | Enforce | Ready |
| `require-resource-limits` | requests + limits present | Enforce | Ready |
| `eshtry-verify-images` | cosign signature for `192.168.1.8:30082/eshtry-mny/*` | **Audit** | Ready |

All five match only `namespaces: [eshtry-mny]`; PolicyReports for the five workloads show **PASS 4 / FAIL 0** for the four chart policies. The four existing cluster-wide policies owned by other projects (hephastos-scoped) are untouched.

## Evidence: unsigned image rejected
With `eshtry-verify-images` temporarily in `Enforce`:
```
Error from server: admission webhook "mutate.kyverno.svc-fail" denied the request:
resource Pod/eshtry-mny/unsigned-image-test was blocked due to the following policies
eshtry-verify-images:
  verify-cosign-key: 'failed to verify image 192.168.1.8:30082/eshtry-mny/eshtry-mny-user:0.1.0-homelab: ...
```
So admission *does* reject unsigned images.

## Blocker: Enforce is currently unusable on this cluster (real, documented)
The same policy also rejects **signed** images with:
```
failed to verify image ...frontend@sha256:9f806bc1...:
  .attestors[0].entries[0].keys: invalid realm in www-authenticate:
  realm host "192.168.1.8" is a private or link-local address
```
Kyverno 1.18.2 bundles a `go-containerregistry` version with an SSRF guard that rejects a bearer-token `realm` served by a **private/link-local IP**. Harbor is reached at `192.168.1.8:30082` (HTTP), so its token realm is a private IP and signature verification cannot complete. The secret was confirmed valid via `cosign verify` locally against the same digest.

Resolutions (each needs an approval per rule 1.11; none chosen silently):
1. Serve Harbor on a **hostname** realm (e.g. `harbor.<ip>.nip.io`) and reference images by that hostname — requires node `registries.yaml` changes (cluster-wide).
2. **Upgrade Kyverno** to a release whose `go-containerregistry` allows same-host private realms (upstream fix #2302).
3. Accept the current tradeoff: **CI enforces signatures** (`cosign verify` in the Jenkins pipeline, blocking), and Kyverno `verify-images` stays in **Audit** for reporting.

Chosen for now: option 3 (no cluster-wide change, service stays up). `eshtry-verify-images` is therefore `Audit`.

## Additive change made
A pull-only `harbor-creds` dockerconfigjson Secret was created in the `kyverno` namespace so the policy *can* authenticate to Harbor (required regardless of the realm issue). It is scoped to the `eshtry-mny` Harbor project robot and is listed in `CHANGE_LOG.md`/`ROLLBACK.md`.
