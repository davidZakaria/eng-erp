# Eng-NJD Docker setup script
# Run in PowerShell from project root: .\scripts\setup-docker.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n=== 1. Checking Docker ===" -ForegroundColor Cyan
docker context use desktop-linux 2>$null
docker info | Select-Object -First 5
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nDocker engine is NOT running." -ForegroundColor Red
    Write-Host "Please open 'Docker Desktop' from the Start menu and wait until it says 'Engine running'." -ForegroundColor Yellow
    Write-Host "Then run this script again.`n"
    exit 1
}

Write-Host "`n=== 2. Starting containers (Postgres + MinIO) ===" -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nPull failed? Retry once:" -ForegroundColor Yellow
    docker compose pull
    docker compose up -d
}

Write-Host "`n=== 3. Container status ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== 4. Configure API .env for Docker Postgres ===" -ForegroundColor Cyan
$envFile = "apps\api\.env"
$dockerUrl = 'DATABASE_URL="postgresql://eng_njd:eng_njd_secret@localhost:5432/eng_njd?schema=public"'
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match 'DATABASE_URL=') {
        $content = $content -replace 'DATABASE_URL="[^"]*"', $dockerUrl
        Set-Content $envFile $content -NoNewline
        Write-Host "Updated DATABASE_URL in apps/api/.env"
    }
} else {
    Copy-Item ".env.example" $envFile
    Write-Host "Created apps/api/.env from .env.example"
}

Write-Host "`n=== 5. Database migrate + seed ===" -ForegroundColor Cyan
Push-Location apps\api
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
Pop-Location

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Start the app:"
Write-Host "  npm run dev:api   (port 3001)"
Write-Host "  npm run dev:web   (port 3000)"
Write-Host "`nMinIO console: http://localhost:9001  (minioadmin / minioadmin123)"
Write-Host "App login:     http://localhost:3000/login`n"
