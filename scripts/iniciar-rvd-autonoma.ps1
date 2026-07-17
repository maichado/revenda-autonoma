# Inicia tudo: PocketBase + schema + frontend (build de producao).
#
# Uso (duplo clique ou terminal):
#   .\Iniciar-RVD-Autonoma.bat
#   .\scripts\iniciar-rvd-autonoma.ps1
#   .\scripts\iniciar-rvd-autonoma.ps1 -Dev          # modo desenvolvimento (hot reload)
#   .\scripts\iniciar-rvd-autonoma.ps1 -Reset        # zera banco e recomeca
#
# Credenciais admin PB: arquivo .env.pb.local (nao vai pro git)

param(
    [switch]$Reset,
    [switch]$Dev,
    [switch]$SemBrowser
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'lib\pb-paths.ps1')
$PbDir = Get-PbDirectory -ProjectRoot $RootDir
$PbExe = Join-Path $PbDir 'pocketbase.exe'
$PbData = Join-Path $PbDir 'pb_data'

. (Join-Path $PSScriptRoot 'load-pb-secrets.ps1') -RootDir $RootDir

$env:PB_URL = 'http://127.0.0.1:8090'

function Test-PbHealth {
    try {
        Invoke-RestMethod -Uri 'http://127.0.0.1:8090/api/health' -TimeoutSec 3 | Out-Null
        return $true
    } catch { return $false }
}

function Stop-PbPort8090 {
    try {
        $pids = Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -gt 0) {
                taskkill /PID $procId /F 2>$null | Out-Null
            }
        }
        Start-Sleep -Seconds 1
    } catch { }
}

function Wait-PbHealth {
    param([int]$MaxSeconds = 45)
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PbHealth) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Ensure-PocketBaseBinary {
    $PbVersion = '0.25.8'
    $DownloadUrl = "https://github.com/pocketbase/pocketbase/releases/download/v$PbVersion/pocketbase_${PbVersion}_windows_amd64.zip"

    if (-not (Test-Path $PbDir)) {
        New-Item -ItemType Directory -Path $PbDir | Out-Null
    }
    if (-not (Test-Path $PbExe)) {
        Write-Host '  Baixando PocketBase...' -ForegroundColor Yellow
        $zipPath = Join-Path $env:TEMP 'pocketbase.zip'
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $PbDir -Force
        Remove-Item $zipPath -Force
    }
    $SchemaSrc = Join-Path $RootDir 'pocketbase\pb_schema.json'
    if (Test-Path $SchemaSrc) {
        Copy-Item $SchemaSrc (Join-Path $PbDir 'pb_schema.json') -Force
    }
}

function Invoke-SchemaUpdate {
    if (-not $env:PB_ADMIN_EMAIL -or -not $env:PB_ADMIN_PASSWORD) {
        Write-Host '  Sem .env.pb.local — pulando atualizacao automatica de schema.' -ForegroundColor Yellow
        Write-Host '  Copie .env.pb.local.example para .env.pb.local' -ForegroundColor Gray
        return
    }
    Write-Host '  Verificando / importando schema...' -ForegroundColor Gray
    Set-Location $RootDir
    node (Join-Path $PSScriptRoot 'import-schema.js')
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  Aviso: import-schema falhou (admin PB correto?)' -ForegroundColor Yellow
    }
}

function Invoke-AppSetup {
    if (-not $env:PB_ADMIN_EMAIL -or -not $env:PB_ADMIN_PASSWORD) { return }
    Set-Location $RootDir
    node (Join-Path $PSScriptRoot 'seed-pocketbase.js')
}

function Start-FrontendWindow {
    param([switch]$ModoDev)
    $openFlag = if ($SemBrowser) { '' } else { '; Start-Sleep 2; Start-Process http://localhost:5173' }
    if ($ModoDev) {
        $cmd = "Set-Location '$RootDir'; npm run dev$openFlag"
    } else {
        $cmd = @"
Set-Location '$RootDir'
if (-not (Test-Path 'dist\index.html')) { npm run build }
npm run preview$openFlag
"@
    }
    Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmd
}

Write-Host ''
Write-Host '=== RVD Autônoma — Iniciar tudo ===' -ForegroundColor Cyan
Write-Host ''

if ($Reset) {
    Write-Host '[1/5] Reset PocketBase...' -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'reset-pocketbase.ps1') -Force
} else {
    Write-Host '[1/5] Reset ignorado (use -Reset para zerar)' -ForegroundColor Gray
}

Write-Host '[2/5] PocketBase...' -ForegroundColor Cyan
Ensure-PocketBaseBinary

if (Test-PbHealth) {
    Write-Host '  Online: http://127.0.0.1:8090' -ForegroundColor Green
} else {
    Write-Host '  Subindo PocketBase...' -ForegroundColor Yellow
    Stop-PbPort8090
    $null = Start-Process -FilePath $PbExe -ArgumentList 'serve', '--http=127.0.0.1:8090' `
        -WorkingDirectory $PbDir -PassThru -WindowStyle Minimized
    if (-not (Wait-PbHealth)) {
        Write-Host '  PocketBase nao respondeu.' -ForegroundColor Red
        exit 1
    }
    Write-Host '  PocketBase online.' -ForegroundColor Green
}

Write-Host '[3/5] Schema + usuario app...' -ForegroundColor Cyan
Invoke-SchemaUpdate

$precisaSeed = $false
if ($Reset -or -not (Test-Path $PbData)) { $precisaSeed = $true }
else {
    try {
        $authBody = @{ identity = 'admin@revenda.local'; password = 'RevendaAutonoma2024!' } | ConvertTo-Json
        $auth = Invoke-RestMethod -Method Post `
            -Uri 'http://127.0.0.1:8090/api/collections/users/auth-with-password' `
            -ContentType 'application/json' -Body $authBody -ErrorAction Stop
        $headers = @{ Authorization = $auth.token }
        Invoke-RestMethod -Uri 'http://127.0.0.1:8090/api/collections/veiculos/records?perPage=1' `
            -Headers $headers -ErrorAction Stop | Out-Null
    } catch { $precisaSeed = $true }
}

if ($precisaSeed) {
    if (-not (Test-Path $PbData)) {
        Write-Host '  Primeira vez: crie o admin em http://127.0.0.1:8090/_/' -ForegroundColor Yellow
        Start-Process 'http://127.0.0.1:8090/_/'
        Read-Host 'Pressione Enter apos criar o admin'
    }
    if ($env:PB_ADMIN_EMAIL) {
        Invoke-AppSetup
    } else {
        & (Join-Path $PSScriptRoot 'setup-pocketbase.ps1')
    }
} else {
    Write-Host '  Schema e login do app OK.' -ForegroundColor Green
}

Write-Host '[4/5] Build do frontend...' -ForegroundColor Cyan
Set-Location $RootDir
if ($Dev) {
    Write-Host '  Modo DEV — build ignorado.' -ForegroundColor Gray
} else {
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host '  Build OK (pasta dist/)' -ForegroundColor Green
}

Write-Host '[5/5] Abrindo frontend...' -ForegroundColor Cyan
Start-FrontendWindow -ModoDev:($Dev.IsPresent)

Write-Host ''
Write-Host '=== Pronto ===' -ForegroundColor Green
Write-Host '  App:        http://localhost:5173' -ForegroundColor White
Write-Host '  PocketBase: http://127.0.0.1:8090' -ForegroundColor White
Write-Host '  Login app:  admin@revenda.local / RevendaAutonoma2024!' -ForegroundColor Gray
Write-Host '              adminmaicon / adminmaicon' -ForegroundColor Gray
Write-Host '              cristiano@cristiano.com / cristiano' -ForegroundColor Gray
Write-Host ''
Write-Host 'Dados em:' -ForegroundColor Gray
Write-Host "  $PbData" -ForegroundColor Gray
Write-Host ''
