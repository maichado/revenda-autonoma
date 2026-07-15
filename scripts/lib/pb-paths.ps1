# Resolve a pasta do PocketBase (irmã do repositório).
# Usa rvd-autonoma-pb; se existir só gm-revenda-pb (legado), reutiliza com aviso.

function Get-PbDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $parent = Split-Path $ProjectRoot -Parent
    $pbDir = [System.IO.Path]::GetFullPath((Join-Path $parent 'rvd-autonoma-pb'))
    $legacyDir = [System.IO.Path]::GetFullPath((Join-Path $parent 'gm-revenda-pb'))

    if (Test-Path $pbDir) {
        return $pbDir
    }

    if (Test-Path $legacyDir) {
        Write-Host '  Aviso: usando pasta legada gm-revenda-pb — renomeie para rvd-autonoma-pb quando puder.' -ForegroundColor Yellow
        return $legacyDir
    }

    return $pbDir
}
