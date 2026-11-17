---
name: analysis
description: Revisión independiente de solo lectura de un análisis, plan, diseño o código, hecha por un modelo fuerte (Opus por defecto) en una sesión aparte, con topes de costo, verificación posterior y correcciones. No modifica nada de lo analizado.
disable-model-invocation: true
argument-hint: "<qué analizar> [--tipo analisis|diseno|codigo|plan] [--paths a,b] [--model opus|sonnet] [--budget USD] [--turns N] [--words N] [--web] [--plan] [--out archivo]"
---

# /analysis: revisión independiente de solo lectura

## Qué analizar
$ARGUMENTS

Si no hay objeto de análisis, pídelo y termina. Banderas (todas opcionales):

| Bandera | Efecto | Por defecto |
|---|---|---|
| `--tipo` | Foco del revisor: `analisis` (audita conclusiones y datos), `diseno` (alternativas, trade-offs, riesgos), `codigo` (errores, seguridad, pruebas, simplicidad), `plan` (viabilidad, orden, criterios de aceptación) | `analisis` |
| `--paths a,b` | Carpetas que el revisor puede leer | las mínimas necesarias que tú determines |
| `--model` | Modelo del revisor | `opus` |
| `--budget` | Tope de la sesión en USD | `2` |
| `--turns` | Tope de turnos | `40` |
| `--words` | Tope de palabras del informe | `2500` |
| `--web` | Permite WebSearch para verificar documentación | apagado |
| `--plan` | Pide además un plan de implementación ejecutable sin ambigüedad por otro modelo | apagado |
| `--out ruta` | Guarda el informe íntegro y tus correcciones en esa ruta | solo se muestra |

## Regla central: solo análisis
- No modificas nada de lo analizado: ni archivos, ni configuración, ni sistemas. Solo escribes en una carpeta temporal de la sesión y, si hay `--out`, el informe en esa ruta.
- No implementas nada derivado del informe. Propones y esperas aprobación humana; sugiere ejecutar lo aprobado en una sesión nueva (menos contexto acumulado, menos costo).
- No incluyas secretos, tokens ni datos personales en el encargo, y no expongas carpetas de credenciales ni el home completo.

## Pasos
1. **Reúne contexto tú mismo (sin gastar el modelo fuerte):** identifica el objeto, los datos y las fuentes, y lee lo necesario. **Lista TODAS las decisiones y límites ya tomados por el usuario** (conversación, memoria de la sesión, documentación del proyecto). No omitas ninguna: una decisión omitida lleva al revisor a proponer lo contrario. Si dudas de una, pregúntala.
2. **Define el acceso del revisor:** solo las carpetas imprescindibles (`--add-dir`), incluidas todas las fuentes que necesite para verificar sus afirmaciones. Lo que no deba o no pueda exponerse, verifícalo tú después (lectura, sin costo de modelo fuerte).
3. **Prepara el encargo:** copia `__CLAUDE_HOME__/skills/analysis/references/brief-template.md` a una carpeta temporal y rellena todos los campos `{{...}}`; borra las secciones opcionales que no apliquen. Debe ser autosuficiente: el revisor no ve esta conversación.
4. **Avisa en una línea** (modelo, carpetas, tope, costo esperado de 0,5 a 2 USD) y lanza la sesión con la plantilla de abajo. Si tarda, ejecútala en segundo plano (típico: 5 a 10 minutos).
5. **Verifica la ejecución** con el JSON: `modelUsage` debe contener el modelo pedido, `total_cost_usd` dentro del tope, `terminal_reason` y denegaciones de permisos. Si el modelo no coincide o hubo error, dilo y no presentes el resultado como de ese modelo.
6. **Revisa críticamente el informe; no lo reenvíes tal cual:**
   - contrástalo con las decisiones del paso 1 y marca toda propuesta que las viole;
   - recalcula las cifras clave contra los datos;
   - verifica gratis lo que el revisor dejó sin verificar;
   - detecta premisas débiles: n pequeño, efecto techo (la tarea es tan fácil que no discrimina), poblaciones mezcladas en un mismo ajuste, extrapolaciones sin respaldo;
   - compara la longitud con el tope pedido.
   Redacta "Correcciones posteriores": lo que prevalece sobre el informe del revisor.
7. **Entrega al usuario:** hallazgos principales, correcciones tuyas, qué se mantiene, siguiente paso propuesto y costo real. Con `--out`, guarda el informe íntegro y las correcciones.

## Lanzamiento de la sesión (PowerShell, plantilla)
```powershell
$a = @('-p', 'Lee <ruta-del-encargo> y sigue exactamente sus instrucciones. Tu respuesta final es el documento pedido; no escribas nada mas.',
       '--model', '<modelo>', '--output-format', 'json', '--no-session-persistence',
       '--max-budget-usd', '<tope>', '--max-turns', '<turnos>', '--permission-mode', 'default')
foreach ($d in $carpetas) { $a += '--add-dir'; $a += $d }
if ($web) { $a += '--allowedTools'; $a += 'WebSearch'; $a += 'ToolSearch' }
$a += '--disallowedTools'; $a += 'Edit'; $a += 'Write'; $a += 'Bash'; $a += 'PowerShell'; $a += 'NotebookEdit'; $a += 'Agent'
Push-Location <carpeta-temporal-neutral>
$raw = & claude @a 2>&1 | Out-String
Pop-Location
$r = $raw | ConvertFrom-Json; if ($r -is [array]) { $r = $r | Where-Object { $_.type -eq 'result' } | Select-Object -First 1 }
# comprobar: $r.modelUsage (modelo real y costo por modelo), $r.total_cost_usd, $r.terminal_reason, $r.permission_denials; el informe es $r.result
```
Por qué cada pieza: `--output-format json` permite verificar modelo y costo reales; `--max-budget-usd` y `--max-turns` son el único freno técnico (el tope de palabras es solo una instrucción); `--add-dir` limita lo que puede leer; las herramientas bloqueadas garantizan solo lectura y que no lance subagentes; ejecutar desde una carpeta neutral y con `--no-session-persistence` evita residuos.

## Reglas de calidad del encargo (lecciones de una sesión de referencia)
- El revisor debe **intentar refutar primero** y etiquetar cada afirmación importante como `[medido]`, `[documentación]` o `[hipótesis]`, sin inventar cifras, e indicar n y limitaciones.
- El tope de palabras no se cumple por sí solo (en la sesión de referencia se pasó 4 251 de 3 500 y la salida fue cerca de la mitad del costo): pide formato tabular y secciones numeradas, y confía en el tope de presupuesto.
- Pide rutas relativas o con `~` en el informe, no rutas absolutas del disco.
- Separa siempre lo medido de lo supuesto, y no aceptes conclusiones con una sola muestra.
- El plan de implementación (solo con `--plan`) debe traer archivos exactos, cambio exacto, pruebas, criterio de aceptación y cómo revertir, además de qué pasos necesitan aprobación humana.
- Si hay experimentos que proponer, cada uno con su costo estimado y su umbral de decisión.

## Salida final al usuario
Máximo ~40 líneas: veredicto, correcciones principales, mitigaciones o plan propuesto, pendientes de decisión del usuario, costo real de la sesión y ruta del informe si se guardó.
