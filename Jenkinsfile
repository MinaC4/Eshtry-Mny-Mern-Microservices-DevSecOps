pipeline {
    agent any

    parameters {
        booleanParam(name: 'SONAR_ENABLED', defaultValue: false, description: 'Run SonarQube analysis (requires the sonar-token credential and a reachable server)')
        booleanParam(name: 'PUSH_GITOPS', defaultValue: true, description: 'Push the digest-pinned values.yaml back to Git for Argo CD')
        string(name: 'GIT_BRANCH', defaultValue: 'devsecops/homelab-engagement', description: 'Branch to push the GitOps commit to')
    }

    environment {
        REGISTRY     = '192.168.1.8:30082/eshtry-mny'
        IMAGE_TAG    = "${BUILD_NUMBER}"
        COSIGN_IMAGE = 'gcr.io/projectsigstore/cosign:v2.6.4'
        NODE_IMAGE   = 'node:20-alpine'
        YQ_IMAGE     = 'mikefarah/yq:4'
        SONAR_IMAGE  = 'sonarsource/sonar-scanner-cli:latest'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
                script { env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim() }
            }
        }

        stage('Quality & Tests') {
            parallel {
                stage('Security: Secret Scan') {
                    steps { sh 'docker run --rm -v "$PWD":/repo ghcr.io/gitleaks/gitleaks:latest detect --source=/repo --config=/repo/.gitleaks.toml -v --exit-code=1' }
                }
                stage('Test: User')    { steps { sh 'docker run --rm -v "$PWD/User":/app -w /app node:20-alpine sh -c "npm ci --no-audit --no-fund && npm test && rm -rf node_modules"' } }
                stage('Test: Product') { steps { sh 'docker run --rm -v "$PWD/Product":/app -w /app node:20-alpine sh -c "npm ci --no-audit --no-fund && npm test && rm -rf node_modules"' } }
                stage('Test: Cart')    { steps { sh 'docker run --rm -v "$PWD/Cart":/app -w /app node:20-alpine sh -c "npm ci --no-audit --no-fund && npm test && rm -rf node_modules"' } }
            }
        }

        stage('SonarQube Analysis') {
            when { expression { params.SONAR_ENABLED } }
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        for svc in User Product Cart front-end; do
                          docker run --rm -e SONAR_TOKEN -v "$PWD/$svc:/usr/src" "$SONAR_IMAGE" \
                            -Dsonar.projectKey="eshtry-mny-$svc" || true
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
                stage('Audit: User')     { steps { sh 'docker run --rm -e HOME=/tmp -v "$PWD/User":/app:ro -w /app node:20-alpine npm audit --audit-level=high' } }
                stage('Audit: Product')  { steps { sh 'docker run --rm -e HOME=/tmp -v "$PWD/Product":/app:ro -w /app node:20-alpine npm audit --audit-level=high' } }
                stage('Audit: Cart')     { steps { sh 'docker run --rm -e HOME=/tmp -v "$PWD/Cart":/app:ro -w /app node:20-alpine npm audit --audit-level=high' } }
                stage('Audit: Frontend') { steps { sh 'docker run --rm -e HOME=/tmp -v "$PWD/front-end":/app:ro -w /app node:20-alpine npm audit --audit-level=high' } }
            }
        }

        stage('Security: Docker Scan (Trivy)') {
            parallel {
                stage('Trivy: User')     { steps { sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image ${REGISTRY}/eshtry-mny-user:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Product')  { steps { sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image ${REGISTRY}/eshtry-mny-product:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Cart')     { steps { sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image ${REGISTRY}/eshtry-mny-cart:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Frontend') { steps { sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image ${REGISTRY}/eshtry-mny-frontend:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
            }
        }

        stage('Supply Chain: SBOM (Syft)') {
            steps {
                sh '''
                    mkdir -p security/sbom
                    for svc in user product cart frontend; do
                      docker run --rm -v /var/run/docker.sock:/var/run/docker.sock anchore/syft:latest \
                        "docker:${REGISTRY}/eshtry-mny-${svc}:${IMAGE_TAG}" -o cyclonedx-json > "security/sbom/${svc}.cdx.json"
                      echo "sbom ${svc}: $(wc -c < security/sbom/${svc}.cdx.json) bytes"
                    done
                '''
            }
            post { always { archiveArtifacts artifacts: 'security/sbom/*.json', allowEmptyArchive: true } }
        }

        stage('Registry Login & Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'harbor-ci', usernameVariable: 'HARBOR_USR', passwordVariable: 'HARBOR_PSW')]) {
                    sh '''
                        set -e
                        export DOCKER_CONFIG="$PWD/.docker"
                        mkdir -p "$DOCKER_CONFIG"
                        echo "$HARBOR_PSW" | docker login -u "$HARBOR_USR" --password-stdin 192.168.1.8:30082
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
                        KEYFILE="$PWD/.cosign.key"
                        printf '%s' "$COSIGN_KEY_CONTENT" > "$KEYFILE"
                        DOCKERCONF="$PWD/.docker"
                        : > digests.txt
                        for svc in user product cart frontend; do
                          repo="${REGISTRY}/eshtry-mny-${svc}"
                          digest="$(docker inspect --format '{{index .RepoDigests 0}}' "${repo}:${IMAGE_TAG}" | cut -d@ -f2)"
                          echo "${svc}=${repo}@${digest}" >> digests.txt
                          docker run --rm --user 0:0 -e COSIGN_PASSWORD \
                            -v "$KEYFILE:/cosign.key:ro" -v "$DOCKERCONF:/root/.docker:ro" "$COSIGN_IMAGE" \
                            sign --yes --key /cosign.key --tlog-upload=false --allow-insecure-registry "${repo}@${digest}"
                        done
                        for line in $(cat digests.txt); do
                          ref="${line#*=}"
                          docker run --rm --user 0:0 \
                            -v "$PWD/security/cosign.pub:/cosign.pub:ro" -v "$DOCKERCONF:/root/.docker:ro" "$COSIGN_IMAGE" \
                            verify --key /cosign.pub --insecure-ignore-tlog --allow-insecure-registry "$ref"
                        done
                        rm -f "$KEYFILE"
                    '''
                }
            }
        }

        stage('Helm Lint & Template') {
            steps {
                sh 'docker run --rm -v "$PWD":/w -w /w alpine/helm:3.14.0 lint eshtry-mny'
                sh 'docker run --rm -v "$PWD":/w -w /w alpine/helm:3.14.0 template eshtry-mny eshtry-mny'
            }
        }

        stage('Update GitOps Manifest') {
            when { expression { params.PUSH_GITOPS } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        set -e
                        while IFS='=' read -r svc ref; do
                          expr=$(printf '.images.%s = "%s"' "$svc" "$ref")
                          docker run --rm -v "$PWD/eshtry-mny":/w -w /w mikefarah/yq:4 yq -i "$expr" values.yaml
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
        always {
            sh 'rm -rf "$PWD/.cosign.key" "$PWD/.docker" || true'
        }
        success { echo 'Pipeline Success' }
        failure { echo 'Pipeline Failed' }
    }
}
