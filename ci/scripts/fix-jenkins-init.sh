#!/usr/bin/env bash
# Make the Jenkins init ConfigMap safe to re-apply (non-interactive, no forced
# plugin updates). Idempotent. Re-run this after any Jenkins chart upgrade.
set -euo pipefail
NS="${NAMESPACE:-jenkins}"
CM="${CONFIGMAP:-jenkins}"

src=$(kubectl get cm "$CM" -n "$NS" -o jsonpath='{.data.apply_config\.sh}')
fixed=$(printf '%s' "$src" | sed \
  -e 's#yes n | cp -i /usr/share/jenkins/ref/plugins/\* /var/jenkins_plugins/;#cp -f /usr/share/jenkins/ref/plugins/* /var/jenkins_plugins/;#' \
  -e 's#cp -i /usr/share/jenkins/ref/plugins/\* /var/jenkins_plugins/;#cp -f /usr/share/jenkins/ref/plugins/* /var/jenkins_plugins/;#' \
  -e 's#--latest true;#--latest false;#')

if [ "$src" = "$fixed" ]; then
  echo "jenkins init config already correct"
  exit 0
fi

kubectl get cm "$CM" -n "$NS" -o yaml \
  | sed \
    -e 's#yes n | cp -i /usr/share/jenkins/ref/plugins/\* /var/jenkins_plugins/;#cp -f /usr/share/jenkins/ref/plugins/* /var/jenkins_plugins/;#' \
    -e 's#cp -i /usr/share/jenkins/ref/plugins/\* /var/jenkins_plugins/;#cp -f /usr/share/jenkins/ref/plugins/* /var/jenkins_plugins/;#' \
    -e 's#--latest true;#--latest false;#' \
  | kubectl apply -f -
echo "jenkins init config fixed; restart with: kubectl delete pod jenkins-0 -n $NS"
