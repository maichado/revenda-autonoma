# Atualiza o schema do PocketBase (adiciona collections novas, ex.: simulacoes).
# Nao apaga dados existentes — deleteMissing: false no import.
#
# Uso:
#   1. .\scripts\start-pocketbase.ps1   (em outro terminal)
#   2. .\scripts\atualizar-schema.ps1

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path $PSScriptRoot -Parent

. (Join-Path $PSScriptRoot 'load-pb-secrets.ps1') -RootDir $RootDir

Write-Host ''
Write-Host '=== Revenda Autônoma - Atualizar schema PocketBase ===' -ForegroundColor Cyan
Write-Host ''

try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:8090/api/health' -TimeoutSec 5 | Out-Null
    Write-Host 'PocketBase online em http://127.0.0.1:8090' -ForegroundColor Green
} catch {
    Write-Host 'PocketBase nao esta rodando.' -ForegroundColor Red
    Write-Host 'Inicie: .\scripts\start-pocketbase.ps1' -ForegroundColor Yellow
    exit 1
}

Write-Host ''
if ($env:PB_ADMIN_EMAIL -and $env:PB_ADMIN_PASSWORD) {
    Write-Host 'Usando credenciais de .env.pb.local' -ForegroundColor Gray
    $email = $env:PB_ADMIN_EMAIL
    $password = $env:PB_ADMIN_PASSWORD
} else {
    Write-Host 'Credenciais do superuser (painel http://127.0.0.1:8090/_/)' -ForegroundColor Gray
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
Write-Host 'Importando pocketbase/pb_schema.json (veiculos: data_anuncio, status em preparacao)...' -ForegroundColor Cyan
$env:FORCE_SCHEMA_IMPORT = '1'
node (Join-Path $PSScriptRoot 'import-schema.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'Schema atualizado! Recarregue o app (F5) e salve a data do anuncio no veiculo.' -ForegroundColor Green
Write-Host ''
