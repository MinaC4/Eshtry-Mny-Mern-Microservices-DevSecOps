pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub')
        IMAGE_TAG = "${BUILD_NUMBER}"
        KUBECONFIG = "/var/lib/jenkins/.kube/config"
        SONAR_SCANNER = "/opt/sonar-scanner/bin/sonar-scanner"
        DOCKERHUB_ORG = "minac4"
    }

    stages {
        stage('Checkout Code') { steps { checkout scm } }

        stage('Quality & Tests') {
            parallel {
                stage('Security: Secret Scan') {
                    steps { sh 'docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest detect --source=/repo --config=/repo/.gitleaks.toml --no-git -v --exit-code=1' }
                }
                // SonarQube DISABLED — server not reachable
                stage('Test: User') { steps { sh 'cd User && npm ci && npm test' } }
                stage('Test: Product') { steps { sh 'cd Product && npm ci && npm test' } }
                stage('Test: Cart') { steps { sh 'cd Cart && npm ci && npm test' } }
            }
            post { always { junit allowEmptyResults: true, testResults: '**/test-results/*.xml' } }
        }

        stage('Build & Dependency Audit') {
            parallel {
                stage('Build: User') { steps { sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-user:${IMAGE_TAG} ./User" } }
                stage('Build: Product') { steps { sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-product:${IMAGE_TAG} ./Product" } }
                stage('Build: Cart') { steps { sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-cart:${IMAGE_TAG} ./Cart" } }
                stage('Build: Frontend') { steps { sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-frontend:${IMAGE_TAG} ./front-end" } }
                stage('Audit: User') { steps { sh 'cd User && npm audit --audit-level=high' } }
                stage('Audit: Product') { steps { sh 'cd Product && npm audit --audit-level=high' } }
                stage('Audit: Cart') { steps { sh 'cd Cart && npm audit --audit-level=high' } }
                stage('Audit: Frontend') { steps { sh 'cd front-end && npm audit --audit-level=high' } }
            }
        }

        stage('Security: Docker Scan (Trivy)') {
            parallel {
                stage('Trivy: User') { steps { sh "docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-user:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Product') { steps { sh "docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-product:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Cart') { steps { sh "docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-cart:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
                stage('Trivy: Frontend') { steps { sh "docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-frontend:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1" } }
            }
        }

        stage('Docker Login') { steps { sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin' } }

        stage('Push Images') {
            parallel {
                stage('Push: User') { steps { sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-user:${IMAGE_TAG}" } }
                stage('Push: Product') { steps { sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-product:${IMAGE_TAG}" } }
                stage('Push: Cart') { steps { sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-cart:${IMAGE_TAG}" } }
                stage('Push: Frontend') { steps { sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-frontend:${IMAGE_TAG}" } }
            }
        }

        stage('Update GitOps Manifest') {
            steps {
                sh """
                    yq eval '.images.user = "${DOCKERHUB_ORG}/eshtry-mny-user:${IMAGE_TAG}"' -i eshtry-mny/values.yaml
                    yq eval '.images.product = "${DOCKERHUB_ORG}/eshtry-mny-product:${IMAGE_TAG}"' -i eshtry-mny/values.yaml
                    yq eval '.images.cart = "${DOCKERHUB_ORG}/eshtry-mny-cart:${IMAGE_TAG}"' -i eshtry-mny/values.yaml
                    yq eval '.images.frontend = "${DOCKERHUB_ORG}/eshtry-mny-frontend:${IMAGE_TAG}"' -i eshtry-mny/values.yaml
                    git config user.email "jenkins@eshtry-mny.local"
                    git config user.name "Jenkins CI"
                    git add eshtry-mny/values.yaml
                    git commit -m "ci: update image tags to ${IMAGE_TAG}" || echo "No changes to commit"
                    git pull --rebase origin main
                    git push origin HEAD:main
                """
            }
        }
    }
    post {
        success { echo 'Pipeline Success' }
        failure { echo 'Pipeline Failed' }
    }
}
