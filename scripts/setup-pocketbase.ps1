# Setup completo do PocketBase: importa schema + cria usuarios do app.
# Rode UMA vez apos criar o admin no primeiro `pocketbase serve`.
#
# Uso:
#   1. .\scripts\start-pocketbase.ps1   (em outro terminal)
#   2. .\scripts\setup-pocketbase.ps1

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path $PSScriptRoot -Parent

. (Join-Path $PSScriptRoot 'load-pb-secrets.ps1') -RootDir $RootDir

Write-Host ''
Write-Host '=== Revenda Autônoma - Setup PocketBase ===' -ForegroundColor Cyan
Write-Host ''

try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:8090/api/health' -TimeoutSec 5 | Out-Null
    Write-Host 'PocketBase online em http://127.0.0.1:8090' -ForegroundColor Green
} catch {
    Write-Host 'PocketBase nao esta rodando.' -ForegroundColor Red
    Write-Host 'Inicie em outro terminal: .\scripts\start-pocketbase.ps1' -ForegroundColor Yellow
    Write-Host 'Na primeira vez, crie o admin em http://127.0.0.1:8090/_/' -ForegroundColor Yellow
    exit 1
}

Write-Host ''
if ($env:PB_ADMIN_EMAIL -and $env:PB_ADMIN_PASSWORD) {
    Write-Host 'Usando credenciais de .env.pb.local' -ForegroundColor Gray
    $email = $env:PB_ADMIN_EMAIL
    $password = $env:PB_ADMIN_PASSWORD
} else {
    Write-Host 'Use as credenciais do superuser criadas no painel admin (/_/).' -ForegroundColor Gray
    $email = Read-Host 'E-mail do admin PocketBase'
    $secure = Read-Host 'Senha do admin' -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

$env:PB_URL = 'http://127.0.0.1:8090'
$env:PB_ADMIN_EMAIL = $email
$env:PB_ADMIN_PASSWORD = $password

Set-Location $RootDir

Write-Host ''
Write-Host '[1/2] Importando schema (users + collections do app)...' -ForegroundColor Cyan
Write-Host '      Inclui a collection auth `users` exigida pelo login da SPA.' -ForegroundColor Gray
node (Join-Path $PSScriptRoot 'import-schema.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host '[2/2] Criando usuarios do app (collection users)...' -ForegroundColor Cyan
node (Join-Path $PSScriptRoot 'seed-pocketbase.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'Setup concluido!' -ForegroundColor Green
Write-Host ''
Write-Host 'Login no app:' -ForegroundColor White
Write-Host '  admin@revenda.local / RevendaAutonoma2024!' -ForegroundColor Gray
Write-Host ''
Write-Host 'Inicie o frontend: npm run dev' -ForegroundColor White
Write-Host ''
