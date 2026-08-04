# Conta registros nas collections do app via API REST (requer login do app).
#
# Uso:
#   $env:PB_APP_EMAIL = 'seu@email.com'
#   $env:PB_APP_PASSWORD = 'sua-senha'
#   .\scripts\verify-pocketbase-records.ps1
#
# Ou:
#   .\scripts\verify-pocketbase-records.ps1 -Email 'seu@email.com' -Password 'sua-senha'

param(
  [string]$PbUrl = 'http://127.0.0.1:8090',
  [string]$Email = $env:PB_APP_EMAIL,
  [string]$Password = $env:PB_APP_PASSWORD
)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== RVD Autônoma - Verificar records PocketBase ===' -ForegroundColor Cyan
Write-Host "URL: $PbUrl" -ForegroundColor Gray
Write-Host ''

if (-not $Email -or -not $Password) {
  Write-Host 'Informe credenciais da conta do APP (não do superuser):' -ForegroundColor Red
  Write-Host '  -Email / -Password  ou  $env:PB_APP_EMAIL / $env:PB_APP_PASSWORD' -ForegroundColor Gray
  Write-Host 'Crie a conta em http://localhost:5173 → Criar conta' -ForegroundColor Gray
  exit 1
}

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
  Write-Host 'Falha no login da conta do app. Confira -Email/-Password ou crie a conta no app.' -ForegroundColor Red
  exit 1
}

$token = $auth.token
$headers = @{ Authorization = $token }

$collections = @('veiculos', 'compras', 'vendas', 'despesas', 'configuracoes')

foreach ($col in $collections) {
  try {
    $res = Invoke-RestMethod -Uri "$PbUrl/api/collections/$col/records?perPage=1" -Headers $headers
    Write-Host ("  {0,-16} total={1}" -f $col, $res.totalItems) -ForegroundColor White
  } catch {
    Write-Host ("  {0,-16} ERRO: {1}" -f $col, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ''
