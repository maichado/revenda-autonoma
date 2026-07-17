# Expõe o dev (Vite :5173 + PocketBase via proxy) para um colega remoto via ngrok.
#
# Pré-requisitos:
#   1. ngrok instalado: https://ngrok.com/download
#   2. ngrok config add-authtoken SEU_TOKEN   (ou ngrok.yml com authtoken)
#   3. PocketBase rodando: .\scripts\start-pocketbase.ps1
#
# Uso:
#   .\scripts\iniciar-dev-ngrok.ps1
#   npm run dev:ngrok          (atalho no package.json)

param(
  [switch]$SemBrowser
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path $PSScriptRoot -Parent
Set-Location $RootDir

. (Join-Path $PSScriptRoot 'lib\ngrok-urls.ps1')

Write-Host ''
Write-Host '=== RVD Autônoma — Dev remoto (ngrok) ===' -ForegroundColor Cyan
Write-Host ''

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
  Write-Host 'ngrok não encontrado no PATH.' -ForegroundColor Red
  Write-Host 'Instale: https://ngrok.com/download' -ForegroundColor Yellow
  Write-Host 'Depois: ngrok config add-authtoken SEU_TOKEN' -ForegroundColor Yellow
  exit 1
}

try {
  Invoke-RestMethod -Uri 'http://127.0.0.1:8090/api/health' -TimeoutSec 4 | Out-Null
  Write-Host 'PocketBase OK (8090)' -ForegroundColor Green
} catch {
  Write-Host 'PocketBase offline na porta 8090.' -ForegroundColor Red
  Write-Host 'Em outro terminal: .\scripts\start-pocketbase.ps1' -ForegroundColor Yellow
  exit 1
}

$ngrokConfig = Join-Path $RootDir 'ngrok.yml'
$ngrokArgs = if (Test-Path $ngrokConfig) {
  @('start', '--config', $ngrokConfig, 'rvd-app')
} else {
  @('http', '5173')
}

Write-Host 'Iniciando túnel ngrok (porta 5173)...' -ForegroundColor Gray

$ngrokLog = Join-Path $env:TEMP 'rvd-autonoma-ngrok.log'
if (Test-Path $ngrokLog) { Remove-Item $ngrokLog -Force -ErrorAction SilentlyContinue }

$ngrokProc = Start-Process -FilePath 'ngrok' -ArgumentList $ngrokArgs `
  -PassThru -WindowStyle Minimized `
  -RedirectStandardOutput $ngrokLog -RedirectStandardError $ngrokLog

Start-Sleep -Seconds 2

$publicUrl = Get-NgrokPublicUrl -LocalPort 5173
if (-not $publicUrl) {
  if ($ngrokProc -and -not $ngrokProc.HasExited) {
    Stop-Process -Id $ngrokProc.Id -Force -ErrorAction SilentlyContinue
  }
  Write-Host 'Não foi possível obter a URL pública do ngrok.' -ForegroundColor Red
  Write-Host 'Verifique authtoken: ngrok config add-authtoken SEU_TOKEN' -ForegroundColor Yellow
  exit 1
}

$urlFile = Join-Path $RootDir 'ngrok-url.txt'
Set-Content -Path $urlFile -Value $publicUrl -Encoding UTF8

Write-Host ''
Write-Host 'Link para o dev remoto (app + API via proxy):' -ForegroundColor White
Write-Host "  $publicUrl" -ForegroundColor Green
Write-Host ''
Write-Host "Salvo em: ngrok-url.txt" -ForegroundColor Gray
Write-Host 'Login: adminmaicon / adminmaicon (ou conta criada no sistema)' -ForegroundColor Gray
Write-Host 'Inspector ngrok: http://127.0.0.1:4040' -ForegroundColor Gray
Write-Host ''
Write-Host 'Encerrando: Ctrl+C neste terminal e feche o ngrok se necessário.' -ForegroundColor DarkGray
Write-Host ''

$env:VITE_PB_VIA_PROXY = 'true'

try {
  if ($SemBrowser) {
    npx vite --host
  } else {
    npx vite --host --open
  }
} finally {
  if ($ngrokProc -and -not $ngrokProc.HasExited) {
    Stop-Process -Id $ngrokProc.Id -Force -ErrorAction SilentlyContinue
  }
}
