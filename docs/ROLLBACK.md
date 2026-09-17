# ROLLBACK

Single ordered teardown for everything this engagement adds. Nothing here is executed until the corresponding phase creates the object. Existing platform components (Kyverno, Argo CD, Jenkins, Harbor, Vault, ESO, Prometheus) are **never** removed.

## Phase 0/1 (docs only)
```
git checkout main
git branch -D devsecops/homelab-engagement
```
(No cluster objects.)

## Phase 3+ (to be populated)
```
# namespace-scoped app resources
kubectl delete namespace eshtry-mny            # removes Deployments, Services, HPAs, PDBs, NetworkPolicies, Mongo StatefulSet+PVC, ConfigMap, Secret, Ingress
# Argo CD application (GitOps)
kubectl delete application eshtry-mny -n argocd
# namespaced Kyverno policy (if created as Policy) or scoped ClusterPolicy
kubectl delete policy eshtry-verify-images -n eshtry-mny   # exact name confirmed in Phase 8
# Jenkins: delete the new job and credentials (UI/CLI, added in Phase 4)
# Harbor: delete project eshtry-mny (Phase 4)
```

Order matters: remove the Argo CD Application before deleting the namespace, so self-heal does not recreate workloads.
