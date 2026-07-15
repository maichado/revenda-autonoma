# Carrega PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD de .env.pb.local (se existir).
param([string]$RootDir = (Split-Path $PSScriptRoot -Parent))

$secretsFile = Join-Path $RootDir '.env.pb.local'
if (-not (Test-Path $secretsFile)) {
    return
}

Get-Content $secretsFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) {
        $val = $val.Substring(1, $val.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($key, $val, 'Process')
}
