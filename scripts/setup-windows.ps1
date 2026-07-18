# Run with: powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1

$ErrorActionPreference = "Stop"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO_ROOT = Split-Path -Parent $SCRIPT_DIR

# Check Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is not installed." -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://docs.docker.com/desktop/"
    exit 1
}

# Check Docker daemon is running
try {
    docker info | Out-Null
} catch {
    Write-Host "Error: Docker daemon is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again."
    exit 1
}

# Check docker compose is available
try {
    docker compose version | Out-Null
} catch {
    Write-Host "Error: Docker Compose is not available." -ForegroundColor Red
    Write-Host "Please ensure Docker Desktop includes Docker Compose."
    exit 1
}

Set-Location $REPO_ROOT

# Handle .env file
$envPath = Join-Path $REPO_ROOT ".env"
$envExamplePath = Join-Path $REPO_ROOT ".env.example"

if (-not (Test-Path $envPath)) {
    Write-Host "No .env file found. Creating one from .env.example..."
    Copy-Item $envExamplePath $envPath

    Write-Host ""
    Write-Host "Please enter your configuration values:"
    Write-Host ""

    $mongoUser = Read-Host "MONGO_USERNAME (MongoDB Atlas username)"

    $mongoPassSecure = Read-Host -AsSecureString "MONGO_PASSWORD (MongoDB Atlas password)"
    $mongoPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($mongoPassSecure))

    $mongoCluster = Read-Host "MONGO_CLUSTER (e.g., cluster0.xxxxx.mongodb.net)"

    $mongoDbname = Read-Host "MONGO_DBNAME (database name, default: eshtry_mny)"
    if ([string]::IsNullOrWhiteSpace($mongoDbname)) { $mongoDbname = "eshtry_mny" }

    $accessTokenSecure = Read-Host -AsSecureString "ACCESS_TOKEN (JWT secret, any random string)"
    $accessToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($accessTokenSecure))

    # Update .env file
    $envContent = Get-Content $envPath
    $envContent = $envContent -replace '^MONGO_USERNAME=.*', "MONGO_USERNAME=$mongoUser"
    $envContent = $envContent -replace '^MONGO_PASSWORD=.*', "MONGO_PASSWORD=$mongoPass"
    $envContent = $envContent -replace '^MONGO_CLUSTER=.*', "MONGO_CLUSTER=$mongoCluster"
    $envContent = $envContent -replace '^MONGO_DBNAME=.*', "MONGO_DBNAME=$mongoDbname"
    $envContent = $envContent -replace '^ACCESS_TOKEN=.*', "ACCESS_TOKEN=$accessToken"
    $envContent | Set-Content $envPath

    # Clear sensitive variables from memory
    $mongoPass = $null
    $accessToken = $null

    Write-Host ".env file created successfully."
} else {
    Write-Host ".env file already exists. Using existing configuration."
}

Write-Host ""
Write-Host "Starting services with Docker Compose..."
docker compose up --build -d

Write-Host ""
Write-Host "Waiting for services to be healthy..."
$TIMEOUT = 60
$SERVICES = @(
    @{Name="user"; Port=9001},
    @{Name="product"; Port=9000},
    @{Name="cart"; Port=9003}
)

foreach ($svc in $SERVICES) {
    $name = $svc.Name
    $port = $svc.Port
    $elapsed = 0

    while ($elapsed -lt $TIMEOUT) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Host "Service $name is healthy on port $port"
                break
            }
        } catch { }

        Start-Sleep -Seconds 2
        $elapsed += 2
    }

    if ($elapsed -ge $TIMEOUT) {
        Write-Host "Error: Service $name failed to start within ${TIMEOUT}s" -ForegroundColor Red
        Write-Host ""
        Write-Host "Last 30 lines of $name logs:"
        docker compose logs --tail=30 $name
        exit 1
    }
}

Write-Host ""
Write-Host "All services are running!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:      http://localhost:5173"
Write-Host "User API:      http://localhost:9001/health"
Write-Host "Product API:   http://localhost:9000/health"
Write-Host "Cart API:      http://localhost:9003/health"
Write-Host ""
Write-Host "To stop:       docker compose down"
