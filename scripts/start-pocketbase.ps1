# Inicia PocketBase para Revenda Autônoma (Windows PowerShell)
# Uso: .\scripts\start-pocketbase.ps1

$ErrorActionPreference = "Stop"

$PbDir = Join-Path (Split-Path $PSScriptRoot -Parent) "..\gm-revenda-pb"
$PbDir = [System.IO.Path]::GetFullPath($PbDir)
$PbExe = Join-Path $PbDir "pocketbase.exe"
$PbVersion = "0.25.8"
$DownloadUrl = "https://github.com/pocketbase/pocketbase/releases/download/v$PbVersion/pocketbase_${PbVersion}_windows_amd64.zip"

Write-Host "Pasta PocketBase: $PbDir" -ForegroundColor Cyan

if (-not (Test-Path $PbDir)) {
    New-Item -ItemType Directory -Path $PbDir | Out-Null
}

if (-not (Test-Path $PbExe)) {
    Write-Host "Baixando PocketBase v$PbVersion..." -ForegroundColor Yellow
    $zipPath = Join-Path $env:TEMP "pocketbase.zip"
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $PbDir -Force
    Remove-Item $zipPath -Force
    Write-Host "PocketBase instalado em $PbExe" -ForegroundColor Green
}

$SchemaSrc = Join-Path (Split-Path $PSScriptRoot -Parent) "pocketbase\pb_schema.json"
if (Test-Path $SchemaSrc) {
    Copy-Item $SchemaSrc (Join-Path $PbDir "pb_schema.json") -Force
}

Write-Host ""
Write-Host "Iniciando PocketBase em http://127.0.0.1:8090" -ForegroundColor Green
Write-Host "Admin UI: http://127.0.0.1:8090/_/" -ForegroundColor Green
Write-Host "Na primeira vez: crie o admin em http://127.0.0.1:8090/_/" -ForegroundColor Yellow
Write-Host "Depois rode (outro terminal): .\scripts\setup-pocketbase.ps1" -ForegroundColor Yellow
Write-Host ""

Set-Location $PbDir
& $PbExe serve --http=127.0.0.1:8090
