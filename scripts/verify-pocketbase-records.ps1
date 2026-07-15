# Conta registros nas collections do app via API REST (requer login).
#
# Uso:
#   .\scripts\verify-pocketbase-records.ps1
#   .\scripts\verify-pocketbase-records.ps1 -Email "maicon@gmrevenda.local" -Password "GmRevenda2024!"

param(
  [string]$PbUrl = 'http://127.0.0.1:8090',
  [string]$Email = 'maicon@gmrevenda.local',
  [string]$Password = 'GmRevenda2024!'
)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== MG Revenda - Verificar records PocketBase ===' -ForegroundColor Cyan
Write-Host "URL: $PbUrl" -ForegroundColor Gray
Write-Host ''

try {
  Invoke-RestMethod -Uri "$PbUrl/api/health" -TimeoutSec 5 | Out-Null
} catch {
  Write-Host 'PocketBase offline. Inicie: .\scripts\start-pocketbase.ps1' -ForegroundColor Red
  exit 1
}

$authBody = @{ identity = $Email; password = $Password } | ConvertTo-Json
try {
  $auth = Invoke-RestMethod -Method Post -Uri "$PbUrl/api/collections/users/auth-with-password" `
    -ContentType 'application/json' -Body $authBody
} catch {
  Write-Host "Falha no login ($Email). Ajuste -Email/-Password ou rode setup-pocketbase.ps1" -ForegroundColor Red
  exit 1
}

$token = $auth.token
$headers = @{ Authorization = $token }

$collections = @('veiculos', 'compras', 'vendas', 'despesas', 'configuracoes')

foreach ($col in $collections) {
  $res = Invoke-RestMethod -Uri "$PbUrl/api/collections/$col/records?perPage=1&page=1" -Headers $headers
  $total = $res.totalItems
  $cor = if ($total -gt 0) { 'Green' } else { 'Yellow' }
  Write-Host ("{0,-16} {1,5} registro(s)" -f $col, $total) -ForegroundColor $cor
}

Write-Host ''
Write-Host "Admin UI: $PbUrl/_/" -ForegroundColor White
Write-Host ''
