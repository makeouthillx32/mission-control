$IMAGE = "ghcr.io/makeouthillx32/mission-control"
$TAG = "latest"
$ENV_FILE = "C:\Users\skill\.openclaw\.env"
$env:DOCKER_BUILDKIT = "1"

$buildArgs = @()
if (Test-Path $ENV_FILE) {
    Get-Content $ENV_FILE | ForEach-Object {
        if ($_ -match "^(NEXT_PUBLIC_[^=]+)=(.*)$") {
            $buildArgs += "--build-arg"
            $buildArgs += "$($Matches[1])=$($Matches[2])"
        }
    }
}

Write-Host "Building Mission Control with $($buildArgs.Count / 2) NEXT_PUBLIC vars from .env..." -ForegroundColor Cyan

$buildCmd = @("build","--progress=plain","--no-cache","--build-arg","BUILDKIT_INLINE_CACHE=1") + $buildArgs + @("-t","${IMAGE}:${TAG}",".")
& docker @buildCmd

if ($LASTEXITCODE -ne 0) { Write-Host "Build failed" -ForegroundColor Red; exit 1 }

Write-Host "Pushing..." -ForegroundColor Green
docker push "${IMAGE}:${TAG}"

if ($LASTEXITCODE -ne 0) { Write-Host "Push failed - run: docker login ghcr.io -u makeouthillx32" -ForegroundColor Red; exit 1 }

Write-Host "Restarting container..." -ForegroundColor Green
Set-Location "C:\Users\skill\.openclaw"
docker compose pull mission-control
docker compose up -d mission-control

Write-Host "Done" -ForegroundColor Green