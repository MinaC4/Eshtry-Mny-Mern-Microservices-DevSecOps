#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    echo "Please install Docker Desktop from https://docs.docker.com/desktop/"
    exit 1
fi

# Check Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running."
    echo "Please start Docker Desktop and try again."
    exit 1
fi

# Check docker compose is available
if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available."
    echo "Please ensure Docker Desktop includes Docker Compose."
    exit 1
fi

cd "$REPO_ROOT"

# Handle .env file
if [ ! -f ".env" ]; then
    echo "No .env file found. Creating one from .env.example..."
    cp .env.example .env

    echo ""
    echo "Please enter your configuration values:"
    echo ""

    read -p "MONGO_USERNAME (MongoDB Atlas username): " mongo_user
    read -s -p "MONGO_PASSWORD (MongoDB Atlas password): " mongo_pass
    echo ""
    read -p "MONGO_CLUSTER (e.g., cluster0.xxxxx.mongodb.net): " mongo_cluster
    read -p "MONGO_DBNAME (database name, default: eshtry_mny): " mongo_dbname
    mongo_dbname="${mongo_dbname:-eshtry_mny}"
    read -s -p "ACCESS_TOKEN (JWT secret, any random string): " access_token
    echo ""

    # Update .env file
    sed -i.bak "s|^MONGO_USERNAME=.*|MONGO_USERNAME=$mongo_user|" .env
    sed -i.bak "s|^MONGO_PASSWORD=.*|MONGO_PASSWORD=$mongo_pass|" .env
    sed -i.bak "s|^MONGO_CLUSTER=.*|MONGO_CLUSTER=$mongo_cluster|" .env
    sed -i.bak "s|^MONGO_DBNAME=.*|MONGO_DBNAME=$mongo_dbname|" .env
    sed -i.bak "s|^ACCESS_TOKEN=.*|ACCESS_TOKEN=$access_token|" .env
    rm -f .env.bak

    echo ".env file created successfully."
else
    echo ".env file already exists. Using existing configuration."
fi

echo ""
echo "Starting services with Docker Compose..."
docker compose up --build -d

echo ""
echo "Waiting for services to be healthy..."
TIMEOUT=60
ELAPSED=0
SERVICES=("user:9001" "product:9000" "cart:9003")

for svc in "${SERVICES[@]}"; do
    name="${svc%%:*}"
    port="${svc##*:}"
    ELAPSED=0

    while [ $ELAPSED -lt $TIMEOUT ]; do
        if curl -sf "http://localhost:$port/health" &> /dev/null; then
            echo "Service $name is healthy on port $port"
            break
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
    done

    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "Error: Service $name failed to start within ${TIMEOUT}s"
        echo ""
        echo "Last 30 lines of $name logs:"
        docker compose logs --tail=30 "$name"
        exit 1
    fi
done

echo ""
echo "All services are running!"
echo ""
echo "Frontend:      http://localhost:5173"
echo "User API:      http://localhost:9001/health"
echo "Product API:   http://localhost:9000/health"
echo "Cart API:      http://localhost:9003/health"
echo ""
echo "To stop:       docker compose down"
