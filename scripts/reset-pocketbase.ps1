# Apaga TODOS os dados do PocketBase local (pasta pb_data).
# Use quando houver conflito de importacao ou quiser comecar do zero.
#
# Uso:
#   .\scripts\reset-pocketbase.ps1
#   .\scripts\reset-pocketbase.ps1 -Force   # sem confirmacao (scripts automatizados)
#
# Depois:
#   .\scripts\iniciar-gm-revenda.ps1
#   ou manualmente: start-pocketbase.ps1 + setup-pocketbase.ps1

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$PbDir = Join-Path (Split-Path $PSScriptRoot -Parent) '..\gm-revenda-pb'
$PbDir = [System.IO.Path]::GetFullPath($PbDir)
$PbData = Join-Path $PbDir 'pb_data'

Write-Host ''
Write-Host '=== MG Revenda - RESET PocketBase ===' -ForegroundColor Red
Write-Host ''
Write-Host 'ATENCAO: esta operacao apaga TODOS os dados do PocketBase local:' -ForegroundColor Yellow
Write-Host '  - veiculos, compras, vendas, despesas, configuracoes' -ForegroundColor Yellow
Write-Host '  - usuarios do app (collection users)' -ForegroundColor Yellow
Write-Host '  - o banco SQLite em pb_data/' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Um backup da pasta pb_data sera criado com timestamp antes de apagar.' -ForegroundColor Gray
Write-Host ''

if (-not $Force) {
    $confirmacao = Read-Host 'Digite RESETAR para confirmar'
    if ($confirmacao -ne 'RESETAR') {
        Write-Host 'Operacao cancelada.' -ForegroundColor Cyan
        exit 0
    }
}

Write-Host ''
Write-Host 'Parando processos na porta 8090 (se houver)...' -ForegroundColor Cyan

try {
    $conns = Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        if ($procId -and $procId -gt 0) {
            Write-Host "  Encerrando PID $procId" -ForegroundColor Gray
            taskkill /PID $procId /F 2>$null | Out-Null
        }
    }
    Start-Sleep -Seconds 1
} catch {
    Write-Host '  Nao foi possivel verificar a porta 8090 (ignorando).' -ForegroundColor Gray
}

if (-not (Test-Path $PbData)) {
    Write-Host ''
    Write-Host "Pasta pb_data nao existe: $PbData" -ForegroundColor Yellow
    Write-Host 'Nada a apagar. PocketBase criara pb_data no proximo start.' -ForegroundColor Green
} else {
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupDir = Join-Path $PbDir "pb_data_backup_$stamp"

    Write-Host ''
    Write-Host "Criando backup em: $backupDir" -ForegroundColor Cyan
    Move-Item -Path $PbData -Destination $backupDir -Force
    Write-Host 'pb_data removida com sucesso.' -ForegroundColor Green
}

Write-Host ''
Write-Host '=== Proximos passos ===' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Opcao rapida (recomendado):' -ForegroundColor White
Write-Host '  .\scripts\iniciar-gm-revenda.ps1' -ForegroundColor Gray
Write-Host ''
Write-Host 'Ou manualmente:' -ForegroundColor White
Write-Host '  1. .\scripts\start-pocketbase.ps1' -ForegroundColor Gray
Write-Host '  2. Crie o superuser admin em http://127.0.0.1:8090/_/ (se pb_data foi apagada)' -ForegroundColor Gray
Write-Host '  3. .\scripts\setup-pocketbase.ps1' -ForegroundColor Gray
Write-Host '  4. npm run dev  ->  login maicon@gmrevenda.local / GmRevenda2024!' -ForegroundColor Gray
Write-Host ''
