<#
Instala el skill /analysis en ~/.claude copiando analysis/claude/** y resolviendo el marcador __CLAUDE_HOME__.
  .\install.ps1          instala (respalda en ~/.claude/backups lo que cambie)
  .\install.ps1 -Check   solo compara; termina con codigo 1 si lo desplegado difiere del repo
Fuente de verdad: este repo. No edites los archivos en ~/.claude: edita aqui y vuelve a instalar.
#>
param([switch]$Check)
$ErrorActionPreference = 'Stop'

$src = Join-Path $PSScriptRoot 'claude'
$claudeHome = Join-Path $env:USERPROFILE '.claude'
$fwd = $claudeHome -replace '\\', '/'
$utf8 = New-Object System.Text.UTF8Encoding($false)   # sin BOM: un BOM rompe el frontmatter YAML
$backup = Join-Path $claudeHome ('backups\analysis-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$diff = 0

Get-ChildItem $src -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($src.Length).TrimStart('\')
    $target = Join-Path $claudeHome $rel
    $new = ([IO.File]::ReadAllText($_.FullName, $utf8) -replace "`r`n", "`n").Replace('__CLAUDE_HOME__', $fwd)
    $old = $null
    if (Test-Path $target) { $old = [IO.File]::ReadAllText($target, $utf8) -replace "`r`n", "`n" }
    if ($old -eq $new) { "= $rel"; return }
    $diff++
    if ($Check) { $estado = if ($null -eq $old) { 'falta' } else { 'difiere' }; "! $rel ($estado)"; return }
    if ($null -ne $old) {
        $b = Join-Path $backup $rel
        New-Item -ItemType Directory (Split-Path $b) -Force | Out-Null
        Copy-Item $target $b
    }
    New-Item -ItemType Directory (Split-Path $target) -Force | Out-Null
    [IO.File]::WriteAllText($target, $new, $utf8)
    "+ $rel"
}

if ($Check) {
    if ($diff) { "$diff archivo(s) difieren."; exit 1 } else { 'Despliegue identico al repo.' }
} else {
    $nota = ''
    if (Test-Path $backup) { $nota = " Respaldo de lo reemplazado en $backup" }
    "Listo: $diff archivo(s) escritos.$nota"
}
