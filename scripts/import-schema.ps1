# Importa pocketbase/pb_schema.json via API admin.
# Uso: .\scripts\import-schema.ps1

$ErrorActionPreference = "Stop"
$RootDir = Split-Path $PSScriptRoot -Parent

try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8090/api/health" -TimeoutSec 5 | Out-Null
} catch {
    Write-Host "PocketBase não está rodando. Inicie com: .\scripts\start-pocketbase.ps1" -ForegroundColor Red
    exit 1
}

$email = Read-Host "E-mail do admin PocketBase (superuser)"
$secure = Read-Host "Senha do admin" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$env:PB_URL = "http://127.0.0.1:8090"
$env:PB_ADMIN_EMAIL = $email
$env:PB_ADMIN_PASSWORD = $password

Set-Location $RootDir
node (Join-Path $PSScriptRoot "import-schema.js")
exit $LASTEXITCODE
