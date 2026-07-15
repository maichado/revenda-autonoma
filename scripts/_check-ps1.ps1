$scripts = 'c:\Users\maich\OneDrive\Documentos\ControleCompraVenda\gm-revenda\scripts'
foreach ($f in @('setup-pocketbase.ps1','import-schema.ps1','start-pocketbase.ps1')) {
  $path = Join-Path $scripts $f
  Write-Host "=== $f ==="
  $text = Get-Content -Raw -Path $path
  $lineNum = 0
  foreach ($line in ($text -split "`r?`n")) {
    $lineNum++
    $chars = $line.ToCharArray()
    for ($i = 0; $i -lt $chars.Length; $i++) {
      $code = [int]$chars[$i]
      if ($code -eq 0x201C -or $code -eq 0x201D -or $code -eq 0x2018 -or $code -eq 0x2019) {
        Write-Host "SMART QUOTE line $lineNum col $($i+1) U+$($code.ToString('X4'))"
      }
    }
  }
  $errs = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$null, [ref]$errs)
  if ($errs) { $errs | ForEach-Object { Write-Host "ERR: $($_.Message) line $($_.Extent.StartLineNumber)" } } else { Write-Host 'PARSE: OK' }
}
