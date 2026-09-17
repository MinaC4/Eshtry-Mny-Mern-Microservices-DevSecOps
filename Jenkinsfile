pipeline {
    agent any

    parameters {
        booleanParam(name: 'SONAR_ENABLED', defaultValue: false, description: 'Run SonarQube analysis (requires the sonar-token credential and a reachable server)')
        booleanParam(name: 'PUSH_GITOPS', defaultValue: true, description: 'Push the digest-pinned values.yaml back to Git for Argo CD')
        string(name: 'GIT_BRANCH', defaultValue: 'devsecops/homelab-engagement', description: 'Branch to push the GitOps commit to')
    }

    environment {
        REGISTRY          = '192.168.1.8:30082/eshtry-mny'
        IMAGE_TAG         = "${BUILD_NUMBER}"
        KUBECONFIG        = "/var/lib/jenkins/.kube/config"
        SONAR_SCANNER     = "/opt/sonar-scanner/bin/sonar-scanner"
        COSIGN_IMAGE      = "gcr.io/projectsigstore/cosign:v2.6.4"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
                script {
                    env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                }
            }
        }

        stage('Quality & Tests') {
            parallel {
                stage('Security: Secret Scan') {
                    steps { sh 'docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest detect --source=/repo --config=/repo/.gitleaks.toml -v --exit-code=1' }
                }
                stage('Test: User')    { steps { sh 'cd User && npm ci --no-audit --no-fund && npm test' } }
                stage('Test: Product') { steps { sh 'cd Product && npm ci --no-audit --no-fund && npm test' } }
                stage('Test: Cart')    { steps { sh 'cd Cart && npm ci --no-audit --no-fund && npm test' } }
            }
            post { always { junit allowEmptyResults: true, testResults: '**/test-results/*.xml' } }
        }

        stage('SonarQube Analysis') {
            when { expression { params.SONAR_ENABLED } }
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        for svc in User Product Cart front-end; do
                          (cd "$svc" && "$SONAR_SCANNER" -Dsonar.token="$SONAR_TOKEN" -Dsonar.projectKey="eshtry-mny-$svc" || true)
                        done
                    '''
                }
            }
        }

        stage('Build & Dependency Audit') {
            parallel {
                stage('Build: User')     { steps { sh "docker build -t ${REGISTRY}/eshtry-mny-user:${IMAGE_TAG} ./User" } }
                stage('Build: Product')  { steps { sh "docker build -t ${REGISTRY}/eshtry-mny-product:${IMAGE_TAG} ./Product" } }
                stage('Build: Cart')     { steps { sh "docker build -t ${REGISTRY}/eshtry-mny-cart:${IMAGE_TAG} ./Cart" } }
                stage('Build: Frontend') { steps { sh "docker build -t ${REGISTRY}/eshtry-mny-frontend:${IMAGE_TAG} ./front-end" } }
                stage('Audit: User')     { steps { sh 'cd User && npm audit --audit-level=high' } }
                stage('Audit: Product')  { steps { sh 'cd Product && npm audit --audit-level=high' } }
                stage('Audit: Cart')     { steps { sh 'cd Cart && npm audit --audit-level=high' } }
                stage('Audit: Frontend') { steps { sh 'cd front-end && npm audit --audit-level=high' } }
            }
        }

        stage('Security: Docker Scan (Trivy)') {
            parallel {
                stage('Trivy: User')     { steps { sh "docker run --rm aquasec/trivy image ${REGISTRY}/eshtry-mny-user:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Product')  { steps { sh "docker run --rm aquasec/trivy image ${REGISTRY}/eshtry-mny-product:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Cart')     { steps { sh "docker run --rm aquasec/trivy image ${REGISTRY}/eshtry-mny-cart:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Frontend') { steps { sh "docker run --rm aquasec/trivy image ${REGISTRY}/eshtry-mny-frontend:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
            }
        }

        stage('Supply Chain: SBOM (Syft)') {
            steps {
                sh '''
                    mkdir -p security/sbom
                    for svc in user product cart frontend; do
                      docker run --rm -v /var/run/docker.sock:/var/run/docker.sock anchore/syft:latest \
                        "docker:${REGISTRY}/eshtry-mny-${svc}:${IMAGE_TAG}" -o cyclonedx-json > "security/sbom/${svc}.cdx.json"
                      echo "sbom ${svc}: $(jq '.components | length' security/sbom/${svc}.cdx.json) components"
                    done
                '''
            }
            post { always { archiveArtifacts artifacts: 'security/sbom/*.json', allowEmptyArchive: true } }
        }

        stage('Registry Login & Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'harbor-ci', usernameVariable: 'HARBOR_USR', passwordVariable: 'HARBOR_PSW')]) {
                    sh 'echo "$HARBOR_PSW" | docker login -u "$HARBOR_USR" --password-stdin 192.168.1.8:30082'
                    sh '''
                        for svc in user product cart frontend; do
                          docker push "${REGISTRY}/eshtry-mny-${svc}:${IMAGE_TAG}"
                        done
                    '''
                }
            }
        }

        stage('Supply Chain: Sign & Verify (cosign)') {
            steps {
                withCredentials([
                    string(credentialsId: 'cosign-key', variable: 'COSIGN_KEY_CONTENT'),
                    string(credentialsId: 'cosign-password', variable: 'COSIGN_PASSWORD')
                ]) {
                    sh '''
                        set -e
                        umask 077
                        KEYFILE="$(mktemp)"
                        printf '%s' "$COSIGN_KEY_CONTENT" > "$KEYFILE"
                        trap 'rm -f "$KEYFILE"' EXIT
                        : > digests.txt
                        for svc in user product cart frontend; do
                          repo="${REGISTRY}/eshtry-mny-${svc}"
                          digest="$(docker inspect --format '{{index .RepoDigests 0}}' "${repo}:${IMAGE_TAG}" | cut -d@ -f2)"
                          echo "${svc}=${repo}@${digest}" >> digests.txt
                          docker run --rm --user 0:0 -e COSIGN_PASSWORD \
                            -v "$KEYFILE:/cosign.key:ro" \
                            -v "$HOME/.docker:/root/.docker:ro" "$COSIGN_IMAGE" \
                            sign --yes --key /cosign.key --tlog-upload=false --allow-insecure-registry \
                            "${repo}@${digest}"
                        done
                        # verify immediately
                        for line in $(cat digests.txt); do
                          ref="${line#*=}"
                          docker run --rm --user 0:0 \
                            -v "$PWD/security/cosign.pub:/cosign.pub:ro" \
                            -v "$HOME/.docker:/root/.docker:ro" "$COSIGN_IMAGE" \
                            verify --key /cosign.pub --insecure-ignore-tlog --allow-insecure-registry "$ref"
                        done
                    '''
                }
            }
        }

        stage('Helm Lint & Template') {
            steps {
                sh 'helm lint eshtry-mny'
                sh 'helm template eshtry-mny eshtry-mny'
            }
        }

        stage('Update GitOps Manifest') {
            when { expression { params.PUSH_GITOPS } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        set -e
                        while IFS='=' read -r svc ref; do
                          yq -i ".images.${svc} = \"${ref}\"" eshtry-mny/values.yaml
                        done < digests.txt
                        git config user.email "jenkins@eshtry-mny.local"
                        git config user.name "Jenkins CI"
                        git add eshtry-mny/values.yaml
                        git commit -m "ci: pin ${IMAGE_TAG} image digests [skip ci]" || echo "No changes to commit"
                        git pull --rebase origin "${GIT_BRANCH}" || true
                        git push "https://x-access-token:${GITHUB_TOKEN}@github.com/MinaC4/Eshtry-Mny-Mern-Microservices-DevSecOps.git" "HEAD:${GIT_BRANCH}"
                    '''
                }
            }
        }
    }

    post {
        success { echo 'Pipeline Success' }
        failure { echo 'Pipeline Failed' }
    }
}
