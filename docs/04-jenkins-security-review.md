# 04 — Jenkins Pipeline & Security Review

## Model
- Jenkins runs as the chart's StatefulSet; the agent uses the **Kubernetes cloud** (pod template `default`, image `jenkins/inbound-agent`), workspace is a **hostPath** on node `mina` (`/home/jenkins/agent`), with the host **Docker socket** mounted.
- Because the agent has no Node/npm/jq/yq/helm, the pipeline runs those tools **via containers** (`node:20-alpine`, `mikefarah/yq:4`, `alpine/helm`, `aquasec/trivy`, `anchore/syft`, `gcr.io/projectsigstore/cosign`, `sonarsource/sonar-scanner-cli`). This keeps the agent image untouched.
- Job: `eshtry-mny` (WorkflowJob, Pipeline script from SCM, branch `devsecops/homelab-engagement`). The pre-existing `boutique-app-ci` job was not modified.

## Pipeline stages (extended, not replaced)
1. Checkout Code
2. Quality & Tests — gitleaks (fixed config, blocking) + `npm test` for the 3 backends (in Node containers)
3. SonarQube Analysis — optional (`SONAR_ENABLED`), containerised scanner, credential `sonar-token`
4. Build & Dependency Audit — 4 image builds + `npm audit --omit=dev --audit-level=high`
5. Security: Docker Scan (Trivy) — shared DB cache, sequential, `HIGH,CRITICAL --exit-code 1`
6. Supply Chain: SBOM (Syft) — CycloneDX JSON per image, archived
7. Registry Login & Push — Harbor robot `harbor-ci`
8. Supply Chain: Sign & Verify (cosign) — key-based, **by digest**, tlog disabled (no public Rekor)
9. Helm Lint & Template
10. Update GitOps Manifest — pins **image digests** into `values.yaml` and pushes to the branch

## Hardening performed
- Registry moved from Docker Hub to the private Harbor project; credentials are a project-scoped push/pull robot (not a personal token).
- Digest pinning replaces mutable tags in the deployed manifest.
- `.gitleaks.toml` was a no-op; fixed (`useDefault = true`) so the secret scan actually blocks.
- Jenkins' own build host keeps the Docker daemon (accepted tradeoff, ADR D6): migration to Kaniko/rootless BuildKit remains a documented CHANGE_REQUEST.

## Known gaps / follow-ups
- **No webhook**: GitHub cannot reach a LAN Jenkins. Triggering is via the Jenkins API (as done here) or a manual build; SCM polling is the alternative.
- SonarQube server pod is currently down; the stage is disabled by default and will run once the server is started.
- Trivy scans only the images built this run (offline DB cache); a scheduled full re-scan is out of scope.

## Evidence
Build `#12` (and `#10`) finished **SUCCESS** with every stage above; console output captured during the engagement.
