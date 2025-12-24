# ================================================================
# SCRIPT DEPLOY THỦ CÔNG - UniHood (Windows PowerShell)
# Quy trình: Build Local → Push → Clean
# ================================================================

param(
    [string]$Version = "latest"
)

# === CẤU HÌNH ===
$REGISTRY = "registry.digitalocean.com/unihood-registry"
$SERVICES = @("api", "client", "worker")

# Hàm helper
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Blue }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

# ================================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 BẮT ĐẦU QUY TRÌNH DEPLOY UNIHOOD" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Docker
Write-Info "Kiểm tra Docker..."
try {
    docker info | Out-Null
    Write-Success "Docker đang hoạt động"
} catch {
    Write-Err "Docker không chạy! Hãy khởi động Docker Desktop."
    exit 1
}

# ================================================================
# BƯỚC 1: BUILD IMAGES
# ================================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔨 BƯỚC 1: BUILD DOCKER IMAGES" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($service in $SERVICES) {
    Write-Info "Building $service..."
    
    docker build `
        -t "$REGISTRY/${service}:$Version" `
        -t "$REGISTRY/${service}:latest" `
        -f "apps/$service/Dockerfile" `
        .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Build $service thất bại!"
        exit 1
    }
    
    Write-Success "Build $service thành công"
}

# ================================================================
# BƯỚC 2: PUSH IMAGES
# ================================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📤 BƯỚC 2: PUSH IMAGES LÊN REGISTRY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($service in $SERVICES) {
    Write-Info "Pushing $service..."
    
    docker push "$REGISTRY/${service}:$Version"
    docker push "$REGISTRY/${service}:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Push $service thất bại!"
        exit 1
    }
    
    Write-Success "Push $service thành công"
}

# ================================================================
# BƯỚC 3: CLEAN UP
# ================================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🧹 BƯỚC 3: DỌN DẸP LOCAL" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Info "Xóa images local..."
foreach ($service in $SERVICES) {
    docker rmi "$REGISTRY/${service}:$Version" 2>$null
    docker rmi "$REGISTRY/${service}:latest" 2>$null
}

Write-Info "Xóa build cache..."
docker builder prune -f | Out-Null

Write-Info "Xóa dangling images..."
docker image prune -f | Out-Null

Write-Success "Dọn dẹp hoàn tất"

# ================================================================
# HOÀN THÀNH
# ================================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🎉 HOÀN THÀNH!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Success "Tất cả images đã được push lên registry"
Write-Host ""
Write-Host "👉 Bước tiếp theo: SSH vào server và chạy:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   ssh root@YOUR_SERVER_IP" -ForegroundColor White
Write-Host "   cd ~/unihood" -ForegroundColor White
Write-Host "   docker compose -f docker-compose.prod.yml pull" -ForegroundColor White
Write-Host "   docker compose -f docker-compose.prod.yml up -d --force-recreate" -ForegroundColor White
Write-Host ""
