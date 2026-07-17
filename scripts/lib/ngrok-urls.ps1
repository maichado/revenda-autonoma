# Lê URLs públicas do agente ngrok local (API em http://127.0.0.1:4040).

function Get-NgrokPublicUrl {
  param(
    [int]$LocalPort = 5173,
    [int]$MaxTentativas = 25
  )

  for ($i = 0; $i -lt $MaxTentativas; $i++) {
    try {
      $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2
      $tunnels = @($resp.tunnels)
      if ($tunnels.Count -eq 0) {
        Start-Sleep -Milliseconds 800
        continue
      }

      $match = $tunnels | Where-Object {
        $_.config.addr -match ":$LocalPort`$" -or $_.config.addr -eq "$LocalPort"
      } | Select-Object -First 1

      if (-not $match) {
        $match = $tunnels | Select-Object -First 1
      }

      $https = ($match.public_url | Where-Object { $_ -like 'https://*' } | Select-Object -First 1)
      if ($https) { return $https }
      if ($match.public_url) { return $match.public_url }
    } catch {
      Start-Sleep -Milliseconds 800
    }
  }

  return $null
}
