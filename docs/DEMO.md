# DEMO — end-to-end walkthrough

URL: `http://eshtry-mny.192.168.1.8.nip.io`

## 1. Commit → pipeline
Push to the working branch, then trigger the Jenkins job `eshtry-mny` (API or UI). The pipeline runs, in order: gitleaks, 3 test suites, SonarQube (optional), 4 image builds, production dependency audit, Trivy (HIGH/CRITICAL, blocking), Syft SBOM, Harbor push, cosign **sign by digest**, `cosign verify`, `helm lint/template`, then it **pins the image digests** into `eshtry-mny/values.yaml` and pushes.

## 2. GitOps deploy
Argo CD sees the new commit, renders the chart, and rolls the Deployments to the signed, digest-pinned images. PostSync it runs the smoke Job.

## 3. Admission
Kyverno enforces (scoped to `eshtry-mny`): no `:latest`, non-root, read-only rootfs, limits. `verify-images` is in Audit (see `docs/08-policy-as-code.md`). Try to deploy `eshtry-mny-user:0.1.0-homelab` (unsigned) while Enforce is on → the API denies it.

## 4. Use the app
Register (gender optional, local phone accepted) → login → browse 26 games → add to cart → remove items → checkout → see the **receipt** (order #, date, customer, itemised total, print). Profile shows real data; logout clears the session.

## 5. Break something → watch it get caught
- Delete a pod → the ReplicaSet recreates it; readiness waits for MongoDB.
- Tamper `app-config` → Argo CD self-heal reverts it within ~15s.
- Point at a disallowed service from a pod → connection blocked by NetworkPolicy.
- Rotate `ACCESS_TOKEN` → old tokens 401; re-login works (restart **all** backends).

## Useful commands
```
kubectl get application eshtry-mny -n argocd
kubectl get pods -n eshtry-mny
kubectl logs -n eshtry-mny-tests job/smoke-test
argocd app sync eshtry-mny
git revert <values.yaml digest commit> && git push   # roll back via Git
```
