<#
Ejecuta tareas del bench-kit contra un solo agente (A) o contra el equipo (TEAM) y consolida metricas en un CSV.
  .\run.ps1 -Tag base -Tasks T1,T2,T3 -Mode A
  .\run.ps1 -Tag base -Tasks T3 -Mode TEAM -TeamFlags '--full --sin-aprobacion'
  .\run.ps1 -Tag triage -Tasks T1,T2,T3,T4 -Mode TEAM -TeamFlags '--sin-aprobacion'
Notas:
  - Trabaja en una copia de base/ bajo $env:TEMP (fuera de carpetas sincronizadas) y no toca el repo.
  - No usa --no-session-persistence: el hook de metricas (team-usage-log.js) lee el transcrito del subagente y sin sesion guardada no hay transcrito.
    Al terminar cada ejecucion borra la carpeta de proyecto que Claude Code creo para esa copia.
  - Costos: los estima Claude Code a precio de lista; cada ejecucion tiene tope -Budget (USD).
#>
param(
    [string]$Tag = 'run',
    [string[]]$Tasks = @('T1', 'T2', 'T3'),
    [ValidateSet('A', 'TEAM')][string]$Mode = 'A',
    [string]$TeamFlags = '--full --sin-aprobacion',
    [string]$Note = '',
    [double]$Budget = 2.0,
    [int]$MaxTurns = 80,
    [string]$ResultsDir = (Join-Path $env:TEMP 'claude-tools-bench\results'),
    [string[]]$Disallowed = @()
)
$ErrorActionPreference = 'Continue'
$kit = $PSScriptRoot
$work = Join-Path $env:TEMP 'claude-tools-bench\runs'
New-Item -ItemType Directory $ResultsDir, $work -Force | Out-Null
$home_ = ($env:USERPROFILE -replace '\\', '/')
$allowed = @("Bash(node $home_/.claude/scripts/team-preflight.js*)", 'Bash(git status*)', 'Bash(git diff*)', 'Bash(git log*)', 'Bash(npm test*)', 'Bash(node --test*)', 'Bash(ls*)', 'Bash(cat *)', 'ToolSearch', 'SendMessage')

foreach ($t in $Tasks) {
    $id = "${Tag}_${t}_${Mode}"
    $run = Join-Path $work $id
    if (Test-Path $run) { Remove-Item $run -Recurse -Force }
    Copy-Item (Join-Path $kit 'base') $run -Recurse
    Push-Location $run
    git init -q 2>$null; git add -A 2>$null; git -c user.email=b@b -c user.name=b commit -qm base 2>$null
    $task = (Get-Content (Join-Path $kit "tasks\$t.txt") -Raw -Encoding UTF8).Trim()
    if ($Mode -eq 'A') { $prompt = "TAREA: $task`nImplementa la tarea, ejecuta npm test y termina con un resumen corto." }
    else { $prompt = "/team $TeamFlags $task"; if ($Note) { $prompt += "`n$Note" } }
    $metrics = Join-Path $ResultsDir "usage-$id"
    if (Test-Path $metrics) { Remove-Item $metrics -Recurse -Force }
    $env:TEAM_METRICS_DIR = $metrics
    $a = @('-p', $prompt, '--model', 'sonnet', '--max-turns', "$MaxTurns", '--output-format', 'json', '--permission-mode', 'acceptEdits', '--max-budget-usd', "$Budget", '--allowedTools') + $allowed
    if ($Disallowed.Count) { $a += '--disallowedTools'; $a += $Disallowed }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $raw = & claude @a 2>&1 | Out-String
    $sw.Stop()
    Remove-Item Env:\TEAM_METRICS_DIR
    Set-Content (Join-Path $ResultsDir "$id.raw.json") $raw -Encoding UTF8

    # calidad: tests ocultos de la tarea
    New-Item -ItemType Directory (Join-Path $run '.hid') -Force | Out-Null
    Copy-Item (Join-Path $kit "hidden\$t.test.js") (Join-Path $run ".hid\$t.test.js") -Force
    $h = node --test --test-reporter=spec ".hid\$t.test.js" 2>&1 | Out-String
    $hp = if ($h -match '(?m)^\S*\s*pass (\d+)\s*$') { [int]$Matches[1] } else { -1 }
    $hf = if ($h -match '(?m)^\S*\s*fail (\d+)\s*$') { [int]$Matches[1] } else { -1 }
    $added = 0; foreach ($l in (git diff --numstat HEAD 2>$null)) { $p = $l -split "`t"; if ($p[0] -match '^\d+$') { $added += [int]$p[0] } }
    foreach ($f in (git ls-files --others --exclude-standard 2>$null | Where-Object { $_ -notlike '.hid*' -and $_ -notlike '.team*' })) { $added += (Get-Content $f -ErrorAction SilentlyContinue | Measure-Object -Line).Lines }

    # metricas del equipo
    $o = $null; try { $o = $raw | ConvertFrom-Json } catch {}
    if ($o -is [array]) { $o = $o | Where-Object { $_.type -eq 'result' } | Select-Object -First 1 }
    $usd = @{ opus = 0; sonnet = 0; haiku = 0 }
    if ($o -and $o.modelUsage) { foreach ($p in $o.modelUsage.PSObject.Properties) { foreach ($k in 'opus', 'sonnet', 'haiku') { if ($p.Name -like "*$k*") { $usd[$k] += $p.Value.costUSD } } } }
    $agents = ''; $archOut = 0; $archRounds = 0; $archFirstOut = 0; $orch = ''
    $uf = Join-Path $metrics 'usage.jsonl'
    if (Test-Path $uf) {
        $rows = @(Get-Content $uf | ForEach-Object { $_ | ConvertFrom-Json })
        $last = $rows | Group-Object agent_id | ForEach-Object { $_.Group | Select-Object -Last 1 }   # filas acumulativas: la ultima por agente
        $agents = ($last | ForEach-Object { "{0}:{1}:out={2}:cc={3}:cr={4}" -f $_.agent_type, ($_.model -replace 'claude-', ''), $_.output, $_.cache_create, $_.cache_read }) -join ' | '
        $arch = @($rows | Where-Object { $_.agent_type -eq 'arquitecto' })
        $archRounds = $arch.Count                                  # una fila por cada vez que el arquitecto se detuvo (incluye reanudaciones)
        if ($arch.Count) { $archFirstOut = $arch[0].output; $archOut = (($arch | Group-Object agent_id | ForEach-Object { $_.Group | Select-Object -Last 1 }) | Measure-Object -Property output -Sum).Sum }
        # orquestador = total de Sonnet en el JSON menos lo que sumaron los subagentes Sonnet
        if ($o -and $o.modelUsage) {
            $sj = ($o.modelUsage.PSObject.Properties | Where-Object { $_.Name -like '*sonnet*' } | Select-Object -First 1).Value
            $ss = $last | Where-Object { $_.model -like '*sonnet*' }
            if ($sj) { $orch = 'out={0};cc={1};cr={2}' -f ($sj.outputTokens - ($ss | Measure-Object output -Sum).Sum), ($sj.cacheCreationInputTokens - ($ss | Measure-Object cache_create -Sum).Sum), ($sj.cacheReadInputTokens - ($ss | Measure-Object cache_read -Sum).Sum) }
        }
    }
    $row = [pscustomobject]@{
        tag = $Tag; task = $t; mode = $Mode; flags = $(if ($Mode -eq 'TEAM') { $TeamFlags } else { '' })
        cost_usd = $(if ($o) { [math]::Round($o.total_cost_usd, 3) } else { '' }); wall_s = [math]::Round($sw.Elapsed.TotalSeconds)
        turns = $(if ($o) { $o.num_turns } else { '' }); is_error = $(if ($o) { $o.is_error } else { 'parse_fail' })
        subagents_spawned = $(if ($o -and $o.subagent_stats) { $o.subagent_stats.spawned } else { 0 })
        by_type = $(if ($o -and $o.subagent_stats) { ($o.subagent_stats.by_type | ConvertTo-Json -Compress) } else { '' })
        usd_opus = [math]::Round($usd.opus, 3); usd_sonnet = [math]::Round($usd.sonnet, 3); usd_haiku = [math]::Round($usd.haiku, 3)
        hidden_pass = $hp; hidden_fail = $hf; lines_added = $added; architect_rounds = $archRounds; architect_first_round_out = $archFirstOut; architect_output_tokens = $archOut; orchestrator_sonnet = $orch; per_agent = $agents
    }
    $row | Export-Csv (Join-Path $ResultsDir "summary-$Tag.csv") -Append -NoTypeInformation -Encoding UTF8   # un CSV por etiqueta: -Append no reescribe la cabecera si cambian las columnas
    ('{0}: cost={1} wall={2}s turns={3} subagentes={4} hidden {5}/{6} lineas={7}' -f $id, $row.cost_usd, $row.wall_s, $row.turns, $row.subagents_spawned, $hp, $hf, $added)
    Pop-Location
    # borra la carpeta de proyecto que Claude Code creo para esta copia
    $mangled = ($run -replace '[^A-Za-z0-9]', '-')
    $pd = Join-Path $env:USERPROFILE ".claude\projects\$mangled"
    if (Test-Path $pd) { Remove-Item $pd -Recurse -Force }
}
