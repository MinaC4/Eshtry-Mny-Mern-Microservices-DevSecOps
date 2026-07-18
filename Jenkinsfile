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
        // Checkout source code from Git repository
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        // Scan for leaked secrets
        stage('Security: Secret Scan (gitleaks)') {
            steps {
                sh 'docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest detect --source=/repo --config=/repo/.gitleaks.toml --no-git -v --exit-code=1'
            }
        }

        // Run SonarQube static code analysis
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh """
                            ${SONAR_SCANNER} \\
                            -Dsonar.projectKey=eshtry-mny \\
                            -Dsonar.sources=. \\
                            -Dsonar.host.url=http://localhost:9000 \\
                            -Dsonar.login=${SONAR_TOKEN}
                        """
                    }
                }
            }
        }

        // Build Docker images for all microservices
        stage('Build Docker Images') {
            steps {
                sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-user:${IMAGE_TAG} ./User"
                sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-product:${IMAGE_TAG} ./Product"
                sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-cart:${IMAGE_TAG} ./Cart"
                sh "docker build -t ${DOCKERHUB_ORG}/eshtry-mny-frontend:${IMAGE_TAG} ./front-end"
            }
        }

        // Run security checks for Node.js dependencies
        stage('Security: Dependency Audit') {
            steps {
                sh 'cd User && npm audit --audit-level=high'
                sh 'cd Product && npm audit --audit-level=high'
                sh 'cd Cart && npm audit --audit-level=high'
                sh 'cd front-end && npm audit --audit-level=high'
            }
        }

        // Scan Docker images for vulnerabilities using Trivy
        stage('Security: Docker Scan (Trivy)') {
            steps {
                sh """
                    docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-user:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1
                    docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-product:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1
                    docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-cart:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1
                    docker run --rm aquasec/trivy image ${DOCKERHUB_ORG}/eshtry-mny-frontend:${IMAGE_TAG} --severity HIGH,CRITICAL --exit-code 1
                """
            }
        }

        // Push Docker images to Docker Hub registry
        stage('Push Images to Docker Hub') {
            steps {
                sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
                sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-user:${IMAGE_TAG}"
                sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-product:${IMAGE_TAG}"
                sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-cart:${IMAGE_TAG}"
                sh "docker push ${DOCKERHUB_ORG}/eshtry-mny-frontend:${IMAGE_TAG}"
            }
        }

        // Update GitOps manifest for Argo CD to apply
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
                    git push origin HEAD:main
                """
            }
        }
    }

    post {
        success {
            echo 'Pipeline Success'
        }
        failure {
            echo 'Pipeline Failed'
        }
    }
}